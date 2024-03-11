import Env "mo:env";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import RBTree "mo:base/RBTree";
import TrieMap "mo:base/TrieMap";
import Principal "mo:base/Principal";
import LockerTypes "LockerTypes";
import OracleTypes "oracles/OracleTypes";

actor {
  let DOMAIN = "PUBLIC_UNIOT";
  let oracles : OracleTypes.Oracle = actor (Env.ORACLES_CANISTER);
  var lockers : RBTree.RBTree<Nat, LockerTypes.Locker> = RBTree.RBTree<Nat, LockerTypes.Locker>(Nat.compare);
  var receivers : TrieMap.TrieMap<Principal, LockerTypes.Receiver> = TrieMap.TrieMap<Principal, LockerTypes.Receiver>(Principal.equal, Principal.hash);

  public shared (msg) func createLocker(userId : Text, deviceId : Text, eventId : Text) : async Nat {
    assert not Principal.isAnonymous(msg.caller);

    let oracleId = await oracles.registerOracle(msg.caller, deviceId, "uniot_device");
    let locker = LockerTypes.Locker(oracleId, DOMAIN, userId, deviceId, eventId);
    await oracles.subscribe(
      oracleId,
      [
        { topic = locker.topicStatus; msgType = "cbor" },
        { topic = locker.topicScript; msgType = "cbor" },
        { topic = locker.topicEvent; msgType = "cbor" }
      ]
    );

    lockers.put(locker.id, locker);
    return oracleId
  };

  public shared (msg) func closeLockerFor(id : Nat, receiverId : Principal) : async Bool {
    assert not Principal.isAnonymous(msg.caller);
    assert not Principal.isAnonymous(receiverId);

    let receiver = switch (receivers.get(receiverId)) {
      case (null) {
        let newReceiver = LockerTypes.Receiver(receiverId);
        receivers.put(receiverId, newReceiver);
        newReceiver
      };
      case (?existingReceiver) existingReceiver
    };

    assert not receiver.hasLocker(id);

    let oracle = await oracles.getOracle(id);

    switch (oracle) {
      case null { false };
      case (?oracle) {
        assert oracle.owner == msg.caller;
        let locker = switch (lockers.get(oracle.id)) {
          case (null) { assert false; false };
          case (?locker) {
            let eventBlob = locker.generateEvent(msg.caller, 1);
            let (successfullUpdates, _) = await oracles.publish(oracle.id, [{ topic = locker.topicEvent; msg = eventBlob; msgType = "cbor"; signed = true }]);

            let success = successfullUpdates > 0;
            if (success) {
              locker.lock(receiverId);
              receiver.putLocker(id)
            };

            success
          }
        }
      }
    }
  };

  public shared (msg) func openLocker(id : Nat) : async Bool {
    assert not Principal.isAnonymous(msg.caller);

    let oracle = await oracles.getOracle(id);

    switch (oracle) {
      case null { false };
      case (?oracle) {
        let locker = switch (lockers.get(oracle.id)) {
          case (null) { assert false; false };
          case (?locker) {
            assert oracle.owner == msg.caller or locker.receiver == msg.caller;

            let eventBlob = locker.generateEvent(msg.caller, 0);
            let (successfullUpdates, _) = await oracles.publish(oracle.id, [{ topic = locker.topicEvent; msg = eventBlob; msgType = "cbor"; signed = true }]);

            let success = successfullUpdates > 0;
            if (success) {
              switch (receivers.get(locker.receiver)) {
                case (null) {};
                case (?receiver) receiver.removeLocker(id)
              };
              locker.unlock()
            };

            success
          }
        }
      }
    }
  };

  public query func getReceiver(principal : Principal) : async ?LockerTypes.ReceiverDto {
    return switch (receivers.get(principal)) {
      case null null;
      case (?receiver) ?receiver.getDto()
    }
  };

  public query (msg) func getMyReceiver() : async LockerTypes.ReceiverDto {
    return switch (receivers.get(msg.caller)) {
      case null { { principal = msg.caller; lockers = [] } };
      case (?receiver) receiver.getDto()
    }
  };

  public shared query func getLocker(lockerId : Nat) : async ?LockerTypes.LockerDto {
    switch (lockers.get(lockerId)) {
      case null null;
      case (?locker) ?locker.getDto()
    }
  }
}

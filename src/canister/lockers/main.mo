import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import RBTree "mo:base/RBTree";
import TrieMap "mo:base/TrieMap";
import Principal "mo:base/Principal";
import Broker "Broker";
import HttpTypes "HttpTypes";
import LockerTypes "LockerTypes";

actor {

  // system func preupgrade() {
  // };

  // system func postupgrade() {
  // };

  public query func transformBrokerResponse(raw : HttpTypes.TransformArgs) : async HttpTypes.HttpResponsePayload {
    Broker.transformResponse(raw)
  };

  let broker = Broker.Broker("mqtt.uniot.io", transformBrokerResponse);
  var subscriptions : TrieMap.TrieMap<Text, LockerTypes.Subscription> = TrieMap.TrieMap<Text, LockerTypes.Subscription>(Text.equal, Text.hash);
  var lockers : RBTree.RBTree<Nat, LockerTypes.Locker> = RBTree.RBTree<Nat, LockerTypes.Locker>(Nat.compare);
  var users : TrieMap.TrieMap<Principal, LockerTypes.User> = TrieMap.TrieMap<Principal, LockerTypes.User>(Principal.equal, Principal.hash);
  /*stable*/ var lockersCounter : Nat = 0;

  public shared (msg) func createLocker(name : Text, template : Text) : async Nat {
    // assert not Principal.isAnonymous(msg.caller);
    assert name != "";
    assert template != "";

    let user = switch (users.get(msg.caller)) {
      case (null) {
        let newUser = LockerTypes.User(msg.caller);
        users.put(msg.caller, newUser);
        newUser
      };
      case (?existingUser) existingUser
    };

    let newLocker = LockerTypes.Locker(lockersCounter, msg.caller, name, template);
    user.putLocker(newLocker);
    lockers.put(newLocker.id, newLocker);
    lockersCounter += 1;

    return newLocker.id
  };

  public shared (msg) func subscribe(lockerId : Nat, subs : [{ topic : Text; msgType : Text }]) {
    let existingLocker = switch (lockers.get(lockerId)) {
      case (null) return assert false;
      case (?locker) locker
    };

    assert existingLocker.owner == msg.caller;
    assert subs.size() > 0;

    for (newSub in subs.vals()) {
      assert newSub.topic != "";
      assert newSub.msgType != "";
      assert switch (existingLocker.subscriptions.get(newSub.topic)) {
        case null true;
        case _ false
      };

      let subscription = switch (subscriptions.get(newSub.topic)) {
        case (null) {
          let newSubscription = LockerTypes.Subscription(newSub.topic);
          subscriptions.put(newSub.topic, newSubscription);
          newSubscription
        };
        case (?existingSubscription) existingSubscription
      };

      existingLocker.subscribe(subscription, newSub.msgType)
    }
  };

  private func publish(topic : Text, message : Blob) {
    switch (subscriptions.get(topic)) {
      case (null) {
        assert false
      };
      case (?existingSubscription) {
        existingSubscription.message := message;
        existingSubscription.timestamp := Time.now();
        ignore subscriptions.replace(topic, existingSubscription)
      }
    }
  };

  public shared (msg) func syncLocker(lockerId : Nat) : async (Nat, Nat) {
    let existingLocker = switch (lockers.get(lockerId)) {
      case (null) { assert false; return (0, 0) };
      case (?locker) locker
    };

    assert existingLocker.owner == msg.caller;

    await broker.handleRetainedMessages(existingLocker.getSubscriptionsIter(), publish)
  };

  public query func getSubscription(topic : Text) : async ?LockerTypes.SubscriptionDto {
    switch (subscriptions.get(topic)) {
      case null null;
      case (?subscription) ?subscription.getDto()
    }
  };

  public query func getLocker(lockerId : Nat) : async ?LockerTypes.LockerDto {
    switch (lockers.get(lockerId)) {
      case null null;
      case (?locker) ?locker.getDto()
    }
  };

  public query func getUser(principal : Principal) : async ?LockerTypes.UserDto {
    return switch (users.get(principal)) {
      case null null;
      case (?user) ?user.getDto()
    }
  };

  public query (msg) func getMyUser() : async LockerTypes.UserDto {
    return switch (users.get(msg.caller)) {
      case null { { principal = msg.caller; lockers = [] } };
      case (?user) user.getDto()
    }
  }
}

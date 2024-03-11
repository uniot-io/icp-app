import I "mo:base/Iter";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Hash "mo:base/Hash";
import Array "mo:base/Array";
import TrieMap "mo:base/TrieMap";
import Nat8 "mo:base/Nat8";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat64 "mo:base/Nat64";
import TrieSetUtils "TrieSetUtils";
import CborValue "cbor/CborValue";
import CborEncoder "mo:cbor/Encoder";

module LockerTypes {

  public let anonymousPrincipal : Blob = "\04";

  public type LockerDto = {
    id : Nat;
    receiver : Principal;
    locked : Bool;
    topicStatus : Text;
    topicScript : Text;
    topicEvent : Text
  };

  public type ReceiverDto = {
    principal : Principal;
    lockers : [Nat]
  };

  public class Locker(_id : Nat, domain : Text, userId : Text, deviceId : Text, eventId : Text) {
    public let id = _id;
    public let topicStatus = domain # "/users/" # userId # "/devices/" # deviceId # "/status";
    public let topicScript = domain # "/users/" # userId # "/devices/" # deviceId # "/script";
    public let topicEvent = domain # "/users/" # userId # "/groups/all/event/" # eventId;
    public let event = eventId;
    public var receiver : Principal = Principal.fromBlob(anonymousPrincipal);

    public func lock(receiverId : Principal) {
      receiver := receiverId
    };

    public func unlock() {
      receiver := Principal.fromBlob(anonymousPrincipal)
    };

    public func isLocked() : Bool {
      receiver != Principal.fromBlob(anonymousPrincipal)
    };

    public func getDto() : LockerDto {
      {
        id;
        receiver;
        locked = isLocked();
        topicStatus;
        topicScript;
        topicEvent
      }
    };

    public func generateEvent(sender : Principal, value : Nat64) : Blob {
      let timestamp = Nat64.fromNat(Int.abs(Time.now() / 1000000));
      Debug.print(debug_show (timestamp));
      let rawMessage = #map([
        (#text("eventID"), #text(event)),
        (#text("value"), #uint(value)),
        (#text("sender"), #map([(#text("type"), #text("icp")), (#text("id"), #text(Principal.toText(sender)))])),
        (#text("timestamp"), #uint(timestamp))
      ]);
      switch (CborEncoder.encode(CborValue.toBasic(rawMessage))) {
        case (#ok(encoded)) Blob.fromArray(encoded);
        case (#err e) {
          Debug.print(debug_show (e));
          Blob.fromArray([])
        }
      }
    }
  };

  public class Receiver(_principal : Principal) {
    public let principal = _principal;
    public var lockers = TrieSetUtils.Set<Nat>(Nat.equal, Hash.hash);

    public func getDto() : ReceiverDto {
      let lockersArray = lockers.toArray();
      { principal; lockers = lockersArray }
    };

    public func putLocker(lockerId : Nat) {
      lockers.put(lockerId)
    };

    public func hasLocker(lockerId : Nat) : Bool {
      lockers.contains(lockerId)
    };

    public func removeLocker(lockerId : Nat) {
      lockers.delete(lockerId)
    }
  }
}

import I "mo:base/Iter";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Hash "mo:base/Hash";
import Array "mo:base/Array";
import TrieMap "mo:base/TrieMap";
import TrieSetUtils "TrieSetUtils";

module LockerTypes {

  public type SubscriptionDto = {
    topic : Text;
    message : Blob;
    timestamp : Int;
    refCount : Nat
  };

  public type LockerDto = {
    id : Nat;
    owner : Principal;
    name : Text;
    template : Text;
    subscriptions : [(Text, Text)]
  };

  public type UserDto = {
    principal : Principal;
    lockers : [Nat]
  };

  public class Subscription(_topic : Text) {
    public let topic = _topic;
    public var message = Blob.fromArray([]);
    public var timestamp : Int = 0;
    public var refCount : Nat = 0;

    public func getDto() : SubscriptionDto { { topic; message; timestamp; refCount } }
  };

  public class Locker(_id : Nat, _owner : Principal, _name : Text, _template : Text) {
    public let id = _id;
    public let owner = _owner;
    public let name = _name;
    public let template = _template;
    public let subscriptions = TrieMap.TrieMap<Text, Text>(Text.equal, Text.hash);

    public func getDto() : LockerDto {
      let subscriptionsArray = Array.init<(Text, Text)>(subscriptions.size(), ("", ""));
      var i = 0;
      for ((key, value) in subscriptions.entries()) {
        subscriptionsArray[i] := (key, value);
        i += 1
      };
      { id; owner; name; template; subscriptions = Array.freeze<(Text, Text)>(subscriptionsArray) }
    };

    public func getSubscriptionsIter() : I.Iter<Text> {
      subscriptions.keys()
    };

    public func subscribe(subscription : Subscription, messageType : Text) {
      subscriptions.put(subscription.topic, messageType);
      subscription.refCount += 1
    }
  };

  public class User(_principal : Principal) {
    public let principal = _principal;
    public var lockers = TrieSetUtils.Set<Nat>(Nat.equal, Hash.hash);

    public func getDto() : UserDto {
      let lockersArray = lockers.toArray();
      { principal; lockers = lockersArray }
    };

    public func putLocker(locker : Locker) {
      lockers.put(locker.id)
    }
  }
}

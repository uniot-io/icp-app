import I "mo:base/Iter";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Blob "mo:base/Blob";

module OracleTypes {
  public type OracleDto = {
    id : Nat;
    registrar : Principal;
    owner : Principal;
    name : Text;
    template : Text;
    subscriptions : [(Text, Text)];
    publications : [Text]
  };

  public type Oracle = actor {
    registerOracle : (owner : Principal, name : Text, template : Text) -> async Nat;
    subscribe : (oracleId : Nat, subs : [{ topic : Text; msgType : Text }]) -> async ();
    publish : (oracleId : Nat, pub : [{ topic : Text; msg : Blob; msgType : Text; signed : Bool }]) -> async (Nat, Nat);
    getOracle : (oracleId : Nat) -> async ?OracleDto
  };
}

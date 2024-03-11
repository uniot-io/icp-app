import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Error = { 'msg' : string };
export interface HttpHeader { 'value' : string, 'name' : string }
export interface HttpResponsePayload {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<HttpHeader>,
}
export interface OracleDto {
  'id' : bigint,
  'subscriptions' : Array<[string, string]>,
  'owner' : Principal,
  'name' : string,
  'publications' : Array<string>,
  'template' : string,
}
export interface PublicationDto {
  'topic' : string,
  'oracleId' : bigint,
  'messageType' : string,
  'message' : Uint8Array | number[],
  'timestamp' : bigint,
  'signed' : boolean,
}
export type Result = { 'ok' : boolean } |
  { 'err' : Error };
export type Result_1 = { 'ok' : string } |
  { 'err' : Error };
export interface SubscriptionDto {
  'verified' : boolean,
  'topic' : string,
  'refCount' : bigint,
  'message' : Uint8Array | number[],
  'timestamp' : bigint,
  'signed' : boolean,
}
export interface TransformArgs {
  'context' : Uint8Array | number[],
  'response' : HttpResponsePayload,
}
export interface UserDto { 'principal' : Principal, 'oracles' : Array<bigint> }
export interface _SERVICE {
  'brokerPublicKey' : ActorMethod<[], string>,
  'createOracle' : ActorMethod<[string, string], bigint>,
  'getMyUser' : ActorMethod<[], UserDto>,
  'getOracle' : ActorMethod<[bigint], [] | [OracleDto]>,
  'getPublication' : ActorMethod<[string], [] | [PublicationDto]>,
  'getSubscription' : ActorMethod<[string], [] | [SubscriptionDto]>,
  'getUser' : ActorMethod<[Principal], [] | [UserDto]>,
  'public_key' : ActorMethod<[], Result_1>,
  'publish' : ActorMethod<
    [
      bigint,
      Array<
        {
          'msg' : Uint8Array | number[],
          'topic' : string,
          'msgType' : string,
          'signed' : boolean,
        }
      >,
    ],
    [bigint, bigint]
  >,
  'publishRetainedMessage' : ActorMethod<[string, string], [boolean, bigint]>,
  'sign' : ActorMethod<[string], Result_1>,
  'signCose' : ActorMethod<[string], Result_1>,
  'subscribe' : ActorMethod<
    [bigint, Array<{ 'topic' : string, 'msgType' : string }>],
    undefined
  >,
  'syncOracle' : ActorMethod<[bigint, boolean], [bigint, bigint]>,
  'transformBrokerResponse' : ActorMethod<[TransformArgs], HttpResponsePayload>,
  'verifyCose' : ActorMethod<[string, string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: ({ IDL }: { IDL: IDL }) => IDL.Type[];

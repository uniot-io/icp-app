export const idlFactory = ({ IDL }) => {
  const UserDto = IDL.Record({
    'principal' : IDL.Principal,
    'oracles' : IDL.Vec(IDL.Nat),
  });
  const OracleDto = IDL.Record({
    'id' : IDL.Nat,
    'subscriptions' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'owner' : IDL.Principal,
    'name' : IDL.Text,
    'publications' : IDL.Vec(IDL.Text),
    'template' : IDL.Text,
  });
  const PublicationDto = IDL.Record({
    'topic' : IDL.Text,
    'oracleId' : IDL.Nat,
    'messageType' : IDL.Text,
    'message' : IDL.Vec(IDL.Nat8),
    'timestamp' : IDL.Int,
    'signed' : IDL.Bool,
  });
  const SubscriptionDto = IDL.Record({
    'verified' : IDL.Bool,
    'topic' : IDL.Text,
    'refCount' : IDL.Nat,
    'message' : IDL.Vec(IDL.Nat8),
    'timestamp' : IDL.Int,
    'signed' : IDL.Bool,
  });
  const Error = IDL.Variant({ 'msg' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : Error });
  const HttpHeader = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const HttpResponsePayload = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HttpHeader),
  });
  const TransformArgs = IDL.Record({
    'context' : IDL.Vec(IDL.Nat8),
    'response' : HttpResponsePayload,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Bool, 'err' : Error });
  return IDL.Service({
    'brokerPublicKey' : IDL.Func([], [IDL.Text], []),
    'createOracle' : IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    'getMyUser' : IDL.Func([], [UserDto], ['query']),
    'getOracle' : IDL.Func([IDL.Nat], [IDL.Opt(OracleDto)], ['query']),
    'getPublication' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(PublicationDto)],
        ['query'],
      ),
    'getSubscription' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(SubscriptionDto)],
        ['query'],
      ),
    'getUser' : IDL.Func([IDL.Principal], [IDL.Opt(UserDto)], ['query']),
    'public_key' : IDL.Func([], [Result_1], []),
    'publish' : IDL.Func(
        [
          IDL.Nat,
          IDL.Vec(
            IDL.Record({
              'msg' : IDL.Vec(IDL.Nat8),
              'topic' : IDL.Text,
              'msgType' : IDL.Text,
              'signed' : IDL.Bool,
            })
          ),
        ],
        [IDL.Nat, IDL.Nat],
        [],
      ),
    'publishRetainedMessage' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Bool, IDL.Nat],
        [],
      ),
    'sign' : IDL.Func([IDL.Text], [Result_1], []),
    'signCose' : IDL.Func([IDL.Text], [Result_1], []),
    'subscribe' : IDL.Func(
        [
          IDL.Nat,
          IDL.Vec(IDL.Record({ 'topic' : IDL.Text, 'msgType' : IDL.Text })),
        ],
        [],
        ['oneway'],
      ),
    'syncOracle' : IDL.Func([IDL.Nat, IDL.Bool], [IDL.Nat, IDL.Nat], []),
    'transformBrokerResponse' : IDL.Func(
        [TransformArgs],
        [HttpResponsePayload],
        ['query'],
      ),
    'verifyCose' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };

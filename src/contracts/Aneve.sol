pragma solidity ^0.4.11;

contract Aneve {


  uint public modulo;
  uint public generator;

  function participants() constant returns (uint) { return addrList.length; }

  address[] public addrList; // Elements must be unique.
  mapping(address => Voter) public voters;

  struct Voter {
    uint pubkey; // public key: g^x
    uint ballot; // ballot
    bool exist;  // exist is true if a corresponding voter has already voted.
  }

  struct Proof { // Proof of ballot validity
    uint a1;
    uint a2;
    uint b1;
    uint b2;
    uint d1;
    uint d2;
    uint r1;
    uint r2;
  }

  function Aneve(uint _modulo, uint _generator) {
    modulo    = _modulo;
    generator = _generator;
  }

  /////////////////////////////// reset addrList /////////////////////////////////////////

  function resetAddrList() returns (bool) {
    return resetAddrListPrivate(msg.sender);
  }

  function resetAddrListWithSign(bytes _clientsign) returns (bool) {
    bytes32 hash = calcEnvHash('resetAddrList');
    address endUserAddr = recoverAddress(hash, _clientsign);
    return resetAddrListPrivate(endUserAddr);
  }

  function resetAddrListPrivate(address _endUserAddr) private returns (bool) {
    // endUser がリセットする権限を持っているかのチェックが必要

    for (uint i = 0; i < addrList.length; i++) {
      delete voters[addrList[i]];
    }
    delete addrList;

    return true;
  }

  /////////////////////////////// set public key /////////////////////////////////////////

  function setPubKey(uint _pubkey, uint _zkp_g, uint _zkp_s) returns (bool) {
    return setPubKeyPrivate(msg.sender, _pubkey, _zkp_g, _zkp_s);
  }

  function setPubKeyWithSign(address _endUserAddr,
                             uint _pubkey,
                             uint _zkp_g,
                             uint _zkp_s,
                             bytes _clientsign) returns (bool) {

    bytes32 hash = calcEnvHash('setPubKey');
    hash = sha3(hash, _endUserAddr);
    hash = sha3(hash, _pubkey);

    address endUserAddr = recoverAddress(hash, _clientsign);

    if (endUserAddr != _endUserAddr) return false;

    return setPubKeyPrivate(_endUserAddr, _pubkey, _zkp_g, _zkp_s);
  }

  function setPubKeyPrivate(address _endUserAddr,
                            uint _pubkey,
                            uint _zkp_g,
                            uint _zkp_s) private returns (bool) {

    if (!prove_knowledge_of_discrete_log(_pubkey, _zkp_g, _zkp_s)) return false;

    uniquePushToVoters(_endUserAddr);
    voters[_endUserAddr] = Voter(_pubkey, 0, true);

    return true;
  }

  function prove_knowledge_of_discrete_log (uint _pubkey,
                                            uint _zkp_g,
                                            uint _zkp_s) internal constant returns (bool) {

    // Knowledge of discrete logs; zkp
    uint c = uint(sha3(_zkp_g)) % (modulo-1);

    if ( (generator**_zkp_s) % modulo != (_zkp_g * (_pubkey**c)) % modulo ) {
      return false;
    } else {
      return true;
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////

  function calcMagicKey(address _endUserAddr) constant returns (uint a, uint b) {
    a = 1;
    b = 1;
    uint endUserIndex;
    for (uint i = 0; i < addrList.length; i++) {
      if ( _endUserAddr == addrList[i]) {
        endUserIndex = i;
        break;
      }
    }
    for (uint j = 0; int(j) <= int(endUserIndex)-1; j++) {
      a *= voters[addrList[j]].pubkey;
      a %= modulo;
    }
    for (uint k = endUserIndex+1; k < addrList.length; k++) {
      b *= voters[addrList[k]].pubkey;
      b %= modulo;
    }
  }


  /////////////////////////////// vote ////////////////////////////////////////////

  function vote(uint _ballot,
                uint a1,
                uint a2,
                uint b1,
                uint b2,
                uint d1,
                uint d2,
                uint r1,
                uint r2
               ) returns (bool) {

    return votePrivate(msg.sender, _ballot, Proof(a1,a2,b1,b2,d1,d2,r1,r2));
  }

  function voteWithSign(address _endUserAddr,
                        uint _ballot,
                        uint a1,
                        uint a2,
                        uint b1,
                        uint b2,
                        uint d1,
                        uint d2,
                        uint r1,
                        uint r2,
                        bytes _clientsign
                       ) returns (bool) {

    bytes32 hash = calcEnvHash('vote');
    hash = sha3(hash, _endUserAddr);
    hash = sha3(hash, _ballot);

    if (recoverAddress(hash, _clientsign) != _endUserAddr) return false;

    return votePrivate(_endUserAddr, _ballot, Proof(a1,a2,b1,b2,d1,d2,r1,r2));
  }

  function votePrivate(address _endUserAddr,
                       uint _ballot,
                       Proof proof
                      ) private returns (bool) {

    Voter v  = voters[_endUserAddr];
    uint pubkey = v.pubkey;
    var (tmp1, tmp2) = calcMagicKey(_endUserAddr);
    uint magickey = tmp1 * moduloInverse(tmp2, modulo) % modulo;
    if (!prove_ballot_validity(pubkey,_ballot,magickey,proof)) return false;

    v.ballot = _ballot;
    voters[_endUserAddr] = v;
    return true;
  }

  function prove_ballot_validity (uint x,
                                  uint y,
                                  uint h,
                                  Proof proof
                                 ) internal constant returns (bool) {

    uint c = (x + y + proof.a1 + proof.a2 + proof.b1 + proof.b2) % modulo;
    if (c == 0) c = 1;

    bool check = true;
    check = check && checkingEquiv(c, proof.d1+proof.d2, modulo-1);
    check = check && checkingEquiv(proof.a1, auxiliary(generator, proof.r1, x, proof.d1), modulo);
    check = check && checkingEquiv(proof.b1, auxiliary(h, proof.r1, y, proof.d1), modulo);
    check = check && checkingEquiv(proof.a2, auxiliary(generator, proof.r2, x, proof.d2), modulo);
    check = check && checkingEquiv(proof.b2, auxiliary(h, proof.r2, y*moduloInverse(generator, modulo)%modulo, proof.d2), modulo);

    return check;
  }

  function checkingEquiv (uint a, uint b, uint mod) internal constant returns (bool) {
    return (a % mod) == (b % mod);
  }

  function auxiliary (uint p, uint a, uint q, uint b) internal constant returns (uint) {
    // this function calculates p^a * q^b
    var tmp1 = (p % modulo) ** a % modulo;
    var tmp2 = (q % modulo) ** b % modulo;
    return (tmp1 * tmp2) % modulo;
  }

  function moduloInverse (uint a, uint p) internal constant returns (uint) {
    a %= p;
    for (uint x = 1; x < p; x++) {
      if ( (a * x) % p == 1 ) return x;
    }
  }

  /////////////////////////////////////////////////////////////////////////////////

  function count() constant returns (uint) {
    uint c = 1;
    for (uint i = 0; i < addrList.length; i++) {
      c *= voters[addrList[i]].ballot;
      c %= modulo;
    }
    return c;
  }

  function uniquePushToVoters(address _addr) private {
    if (voters[_addr].exist == false) {
      addrList.push(_addr);
    }
  }

  /////////////////////////////// Authentication ////////////////////////////////////////////

  function calcEnvHash(bytes32 _functionName) internal constant returns (bytes32) {
    bytes32 h = sha3(this);
    h = sha3(h, _functionName);
    return h;
  }

  function recoverAddress(bytes32 _hash, bytes _sign) internal constant returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;
    if (_sign.length != 65) throw;
    assembly {
        r := mload(add(_sign, 32))
        s := mload(add(_sign, 64))
        v := byte(0, mload(add(_sign, 96)))
    }
    if (v < 27) v += 27;
    if (v != 27 && v != 28) throw;
    address recAddr = ecrecover(_hash, v, r, s);
    if (recAddr == 0) throw;
    return recAddr;
  }

}

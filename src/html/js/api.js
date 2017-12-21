// ===========================================================================//
// Create Aneve Contract
// Check  Aneve's address
// Set    Aneve voting code
// ===========================================================================//

function accSign(hash, acc) {
  return new Promise((resolve, reject) => {
    acc.sign(PASSWD, hash, (err,_sign) => {
      if (err) { console.log(err); reject(err) }
      else     { console.log(_sign); resolve(_sign) }
    })
  })
}

function createAneve(votingname) {
  localStorage.setItem('votingcode', "0x" + ethClient.utils.hash(votingname))
  getAccAndDo(contract => {
    var vc = localStorage.getItem("votingcode")
    accSign(vc, contract.account)
    .then(_clientsign => {
      return contractSendTransaction(contract, 'createAneve', [vc, _clientsign])
    }).then(txHash => {
      document.getElementById("startresult").innerText = "Transaction hash is " + txHash
    })
  })
}

function setAndCheckAneve(votingname) {
  localStorage.setItem('votingcode', "0x" + ethClient.utils.hash(votingname))
  checkAneveAddr(res => {console.log(res)})
}

function checkAneveAddr(callback) {
  getAccAndDo(contract => {
    var vc = localStorage.getItem("votingcode")
    contractCall(contract, "aneveAddr", [vc])
    .then(res => {
      document.getElementById("aneveaddress").innerText = "Voting address is " + res
      localStorage.setItem("aneveAddr", res)
      callback(res)
    })
  })
}

function reset() {
  getAccAndDo(contract => {
    var vc = localStorage.getItem("votingcode")
    var aneveAddr   = localStorage.getItem("aneveAddr")
    var endUserAddr = contract.account.getAddress()
    var hash = ethClient.utils.hashBySolidityType(
                ['address', 'bytes32'],
                [aneveAddr, "resetAddrList"]
               )
    accSign(hash, contract.account)
    .then(_clientsign => {
      return contractSendTransaction(contract, 'resetAddrList', [vc, _clientsign])
    }).then(txHash => {
      console.log(txHash)
      document.getElementById("resetresult").innerText = "Transaction hash is " + txHash
    })
  })
}


// ===========================================================================//
// Get My Address in localStorage
// ===========================================================================//

function getMyAddr () {
  var serializedAccount = localStorage.getItem('account')
  var msg = "s"
  var ret
  if (serializedAccount !== null) {
    var acc = ethClient.Account.deserialize(serializedAccount)
    console.log(acc)
    console.log(acc.getAddress())
    msg = acc.getAddress()
    ret = true
  } else {
    msg = "You don't have an address."
    ret = false
  }
  document.getElementById("myaddress").innerText = "Your address is " + msg
  return ret
}

// ===========================================================================//
// Abstract functions
// ===========================================================================//

function contractCall(contract, method, params) {
  return new Promise((resolve, reject) => {
    contract.call(PASSWD, CONTRACTNAME, method, params, ABI, (err, res) => {
      if (err) { console.error(err); reject(err) }
      else     { resolve(res) }
    })
  })
}

function contractSendTransaction(contract, method, params) {
  return new Promise((resolve, reject) => {
    contract.sendTransaction(PASSWD, CONTRACTNAME, method, params, ABI, (err, txHash) => {
      if (err) { console.error(err); reject(err) }
      else     { resolve(txHash) }
    })
  })
}

function createAcc() {
  ethClient.Account.create(BASEURL, PASSWD, (err, _account) => {
    if (err) {
      console.log(err)
    } else {
      var cnt = new ethClient.AltExecCnsContract(_account, CNSADDRESS)
      console.log(cnt)
      localStorage.setItem('account', _account.serialize())
      document.getElementById("createresult").innerText = "A new account is created."
    }
  })
}

function getAccAndDo(callback) {
  var serializedAccount = localStorage.getItem('account')
  if (serializedAccount !== null) {
    var acc = ethClient.Account.deserialize(serializedAccount)
    var cnt = new ethClient.AltExecCnsContract(acc, CNSADDRESS)
    callback(cnt)
  } else {
    document.getElementById("createresult").innerText = "Please, create a new account."
  }
}

// ===========================================================================//
// ===========================================================================//

function hash_for_proof_ballot (x,y,a1,a2,b1,b2) {
  var modulo = localStorage.getItem('modulo')
  var tmp = (x + y + a1 + a2 + b1 + b2) % modulo
  if (tmp == 0) tmp = 1

  return tmp
}

function proof_check (x, y, h, proof) {
  var generator = localStorage.getItem('generator')
  var modulo    = localStorage.getItem('modulo')
  var vkey      = localStorage.getItem('votingKey')

  var [a1,a2,b1,b2,d1,d2,r1,r2] = proof
  var c = hash_for_proof_ballot(x,y,a1,a2,b1,b2)

  var auxiliary = function(p,a,q,b) {
    // this function calculates p^a * q^b
    var tmp1 = g_x_mod_p(p, a, modulo)
    var tmp2 = g_x_mod_p(q, b, modulo)
    return (tmp1 * tmp2) % modulo
  }

  var check1 = (c - (d1 + d2)) % (modulo-1) == 0 // modulo-1 <-- ok??
  var check2 = (a1 - auxiliary(generator, r1, x, d1)) % modulo == 0
  var check3 = (b1 - auxiliary(h, r1, y, d1))         % modulo == 0
  var check4 = (a2 - auxiliary(generator, r2, x, d2)) % modulo == 0
  var check5 = (b2 - auxiliary(h, r2, y*moduloInverse(generator, modulo)%modulo, d2)) % modulo == 0
  console.log("check1", check1)
  console.log("check2", check2)
  console.log("check3", check3)
  console.log("check4", check4)
  console.log("check5", check5)
  return check1 && check2 && check3 && check4 && check5
}

function special (x) {
  // modulo-1 <-- ok??
  var mod = Number(localStorage.getItem('modulo')) - 1
  return ((x % mod) + mod) % mod
}

function proof_ballot_is_valid (h, v) {
  var generator = Number(localStorage.getItem('generator'))
  var modulo    = Number(localStorage.getItem('modulo'))
  var vkey      = Number(localStorage.getItem('votingKey'))
  var x = g_x_mod_p(generator, vkey, modulo)
  
  var y
  var a1, a2
  var b1, b2
  var d1, d2
  var r1, r2
  var c
  var w = Math.floor( 1 + Math.random() * (modulo-2) ) // 1 <= nonce < modulo-1
  console.log("random nonce w is", w)
  
  if (v == 1) { // v == 1 means YES
    y = g_x_mod_p(h, vkey, modulo) * generator % modulo
    r1 = Math.floor( 1 + Math.random() * (modulo-2) ) // 1 <= nonce < modulo-1
    d1 = Math.floor( 1 + Math.random() * (modulo-2) ) // 1 <= nonce < modulo-1
    a1 = g_x_mod_p(generator, r1, modulo) * g_x_mod_p(x, d1, modulo) % modulo
    b1 = g_x_mod_p(h, r1, modulo) * g_x_mod_p(y, d1, modulo) % modulo
    a2 = g_x_mod_p(generator, w, modulo)
    b2 = g_x_mod_p(h, w, modulo)
    c  = hash_for_proof_ballot(x,y,a1,a2,b1,b2)
    d2 = special(c - d1)
    r2 = special(w - vkey * d2)
  } else if (v == 0) {
    y = g_x_mod_p(h, vkey, modulo)
    r2 = Math.floor( 1 + Math.random() * (modulo-2) ) // 1 <= nonce < modulo-1
    d2 = Math.floor( 1 + Math.random() * (modulo-2) ) // 1 <= nonce < modulo-1
    a1 = g_x_mod_p(generator, w, modulo)
    b1 = g_x_mod_p(h, w, modulo)
    a2 = g_x_mod_p(generator, r2, modulo) * g_x_mod_p(x, d2, modulo) % modulo
    b2 = g_x_mod_p(h, r2, modulo) * g_x_mod_p(y*moduloInverse(generator, modulo)%modulo, d2, modulo) % modulo
    c  = hash_for_proof_ballot(x,y,a1,a2,b1,b2)
    d1 = special(c - d2)
    r1 = special(w - vkey * d1)
  } else {
    console.log("ERROR")
  }
  return [a1,a2,b1,b2,d1,d2,r1,r2]
}

function vote(vform) {
  var v // v must be 0 or 1
  for(var i=0; i < vform.length; i++) {
    if(vform[i].checked == true) {
      v = vform[i].value
    }
  }

  if ( v != 0 && v != 1 ) {
    console.error("invalid value: v must be 0 or 1.")
    return
  }

  var vkey      = localStorage.getItem('votingKey')
  var generator = localStorage.getItem('generator')
  var modulo    = localStorage.getItem('modulo')
  var vc        = localStorage.getItem("votingcode")
  var aneveAddr = localStorage.getItem("aneveAddr")

  var magickey // corresponds to g^y
  getAccAndDo(contract => {
    var endUserAddr = contract.account.getAddress()
    contractCall(contract, 'calcMagicKey', [vc, endUserAddr])
    .then(res => {
      var tmp  = res.join(" ").split(" ")
      magickey = tmp[0] * moduloInverse(tmp[1], modulo) % modulo
      console.log("magic key = " + magickey)
      var ballot = g_x_mod_p(magickey, vkey, modulo) * g_x_mod_p(generator, v, modulo) % modulo
      console.log(ballot)
      return [ballot, magickey]
    }).then(args => {
      var [ballot, magickey] = args

      // zero knowledge proof
      var proof = proof_ballot_is_valid(magickey, v)
      console.log(
        proof,
        proof_check(g_x_mod_p(generator, vkey, modulo), ballot, magickey, proof)
      )

      var hash = ethClient.utils.hashBySolidityType(
                  ['address', 'bytes32', 'address', 'uint'],
                  [aneveAddr, "vote", endUserAddr, ballot]
                 )
      return accSign(hash, contract.account).then(_clientsign => {
        console.log( "vote ->", [ballot].concat(proof) )
        return contractSendTransaction(contract, 'vote', [vc, endUserAddr, ballot].concat(proof).concat([_clientsign]))
      })
    }).then(txHash => {
      console.log(txHash)
      document.getElementById("voteresult").innerText = "Transaction hash is " + txHash
    })
  })
}

function count() {
  var vc = localStorage.getItem("votingcode")
  getAccAndDo(contract => {
    contractCall(contract, 'count', [vc])
    .then(res => {
      console.log("count() returns " + res)
      var generator = localStorage.getItem('generator')
      var modulo    = localStorage.getItem('modulo')
      var gv = res
      var v  = discretelog(gv, generator, modulo)
      document.getElementById("countresult").innerText = v
    })
  })
}

function calcMagicKey() {
  getAccAndDo(contract => {
    var vc = localStorage.getItem("votingcode")
    contractCall(contract, 'calcMagicKey', [vc, contract.account.getAddress()])
    .then(res => {
      var tmp    = res.join(" ").split(" ")
      var modulo = localStorage.getItem('modulo')
      magickey = tmp[0] * moduloInverse(tmp[1], modulo) % modulo
      console.log(tmp)
      document.getElementById("calcresult").innerText = "magic key: " + magickey
    })
  })
}


function participants() {
  var number
  var vc = localStorage.getItem("votingcode")
  getAccAndDo(contract => {
    contractCall(contract, 'participants', [vc])
    .then(res => {
      number = res
      document.getElementById("participants").innerText = number + " participants"
      for (var i = 0; i < number; i++) {
        contractCall(contract, 'addrList', [vc, i]).then(res => {
          document.getElementById("participants").innerText += "\n" + res.join(',')
        })
      }
    })
  })
}


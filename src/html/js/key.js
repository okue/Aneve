
function checkKey() {
  var vkey = localStorage.getItem('votingKey')
  if (vkey != null) {
    document.getElementById('genresult').innerText = "Your private voting key is " + vkey
  } else {
    document.getElementById('genresult').innerText = "Your private voting key doesn't exist"
  }
}

function generateKey() {
  var modulo    = localStorage.getItem('modulo')
  var vkey = Math.floor( 1 + Math.random() * (modulo-2) ) // 1 <= vkey < modulo-1
  localStorage.setItem('votingKey', vkey)
  return vkey
}

function calcPubKey() {
  var generator = localStorage.getItem('generator')
  var modulo    = localStorage.getItem('modulo')
  var vkey      = localStorage.getItem('votingKey')

  var pubkey = g_x_mod_p(generator, vkey, modulo)
  document.getElementById('publishresult').innerText = "Your public voting key is " + pubkey
  return pubkey
}

function knowledge_of_discrete_log(x, h) {
  var modulo    = localStorage.getItem('modulo')
  var generator = localStorage.getItem('generator')
  // Math.random() returns n such as 0 <= n < 1.
  var nonce = Math.floor( 1 + Math.random() * (modulo-2) ) // 1 <= nonce < modulo-1
  var _g    = g_x_mod_p(generator, nonce, modulo)
  var _c    = new BigNumber("0x" + ethClient.utils.hashBySolidityType(['uint'], [_g])).mod(modulo-1)
  var _s    = Number(_c.mul(x).add(nonce).mod(modulo-1).c.join(""))
  return [_g, _s]
}

function publishKey() {
  var vkey = generateKey()
  var pubkey = calcPubKey()
  if (pubkey != null) {
    getAccAndDo(contract => {
      var vc          = localStorage.getItem("votingcode")
      var aneveAddr   = localStorage.getItem("aneveAddr")
      var endUserAddr = contract.account.getAddress()

      var hash = "0x" + ethClient.utils.hashBySolidityType(
        ['address', 'bytes32', 'address', 'uint'],
        [aneveAddr, "setPubKey", endUserAddr, pubkey]
      )

      var zkp = knowledge_of_discrete_log(vkey, pubkey)
      var zkp_g = zkp[0]
      var zkp_s = zkp[1]
      console.log("zkp is ", zkp)
      console.log("vkey is ", vkey)
      console.log("pubkey is ", pubkey)
      accSign(hash, contract.account)
      .then(_clientsign => {
        console.log( "setPubKey ->", [pubkey, zkp_g, zkp_s] )
        return contractSendTransaction(contract, 'setPubKey',
                [vc, endUserAddr, pubkey, zkp_g, zkp_s, _clientsign])
      }).then(txHash => {
        console.log(txHash)
      })
    })
  }
}

function g_x_mod_p (g, x, p) {
  return Math.pow(g % p, x) % p
}

// Check if a given number is prime or not
// Not efficient
function primeCheck (num) {
  if (num === 2) {
    return true
  } else {
    for(i = 2; i < num; i++) {
      if(num % i === 0) {
        return false
      }
    }
    return true
  }
}

// Return b such that a * b = 1 (mod p)
// Not efficient
function moduloInverse (a, p) {
  a %= p
  for (var x = 1; x < p; x++) {
    if ((a*x)%p == 1) {
      return x
    }
  }
}

// Return v such that gv = g^v (mod p)
// Not efficient
// tantative implementation
function discretelog(gv, g, p) {
  for (var v = 0; v < p; v++) {
    if (Math.pow(g,v) % p == gv) {
      return v
    }
  }
  throw new Error("error in discretelog")
}


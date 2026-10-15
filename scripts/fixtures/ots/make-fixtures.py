# Makes the .ots test files for scripts/check-bitcoin-stamp.test.mjs with the official
# OpenTimestamps Python library, offline, and writes what that library reads back from them
# (expected.json), so the Node parser is checked against the official code, not against
# itself.
#
#   pip install opentimestamps-client          (brings opentimestamps and python-bitcoinlib)
#   python3 -I scripts/fixtures/ots/make-fixtures.py
#
# synthetic.*  A made-up batch root with a hand-built proof: append, prepend, sha256,
#              ripemd160 and sha1 steps, a FAKE Bitcoin attestation (block 971004), a
#              pending one and an unknown one. Only for the parser: no real block.
# block586.*   A real Bitcoin block (586) from python-opentimestamps' own test data
#              (opentimestamps/tests/test_bitcoin.py), timestamped with the library's
#              make_timestamp_from_block. Its merkle root, as explorers print it, is the
#              value that test file asserts: 197b3d96…c069594d. This is the byte-order check.
# block1.*     The same for block 1 (that test file's first block; merkle root 0e3e2357…).
# pending.*    A stamp that only has a pending attestation (not upgraded yet).
# SPDX-License-Identifier: Apache-2.0

import hashlib, json, os
from bitcoin.core import CBlock, x, lx, b2lx, b2x
from opentimestamps.core.op import OpAppend, OpPrepend, OpSHA256, OpRIPEMD160, OpSHA1
from opentimestamps.core.notary import (
    BitcoinBlockHeaderAttestation, PendingAttestation, UnknownAttestation)
from opentimestamps.core.timestamp import Timestamp, DetachedTimestampFile
from opentimestamps.core.serialize import BytesSerializationContext, BytesDeserializationContext
from opentimestamps.bitcoin import make_timestamp_from_block

HERE = os.path.dirname(os.path.abspath(__file__))

# From python-opentimestamps 0.4.5, opentimestamps/tests/test_bitcoin.py (public Bitcoin blocks).
BLOCK_1 = '010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e362990101000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0704ffff001d0104ffffffff0100f2052a0100000043410496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858eeac00000000'
BLOCK_1_DIGEST = '0496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858ee'
BLOCK_1_MERKLE = '0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098'
BLOCK_586 = '0100000038babc9586a5fcd60713573494f4377e7c401c33aa24729a4f6cff46000000004d5969c0d10dcce60868fee4d4de80ba5ef38abaeed8a75daa63e48c963d7b1950476f49ffff001d2d9791370301000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0804ffff001d025d06ffffffff0100f2052a0100000043410410daf049ef402de0b6adba8b0f7c392bcf9a6385116efc8b4143b8b7a7841e7de73b478ffe13b60c50ea01e24b4b48c24f5e0fbc5d6c8433c7ca7c3ed3ab8173ac0000000001000000050f40f5e65e115eb4bdb3007f0fb8beaa404cf7ae45de16074e8acc9b69bbf0c3000000004847304402201092da40af6dea8abcbeefb8586335b26d39d36be9b6c38d6c9cc18f20dd5886022045964de79a9008f68d53fc9bc58f9e30b224a1b98dbfda5c7b7b860f32c6aef101ffffffff1bb875b247332e558731c2c510f611d3dde991ea9fe69365bf445a0ccd513b190000000049483045022100b0a1d0a00251c56809a5ab5d7ba6cbe68b82c9bf4f806ee39c568ae537572c840220781ce69017ec3b2d6f96ffff4d19c80c224f40c73b8c26cba4b30e7f4171579b01ffffffff2099e1a92d94c35f0645683257c4c255165385f3e9129a85fed5a3f3d867c9b60000000049483045022100c8e980f43c616232e2d59dce08a5edb84aaa0915ea49780a8af367330216084a02203cc2628f16f995c7aaf6104cba64971963a4e084e4fbd0b6bcf825b47a09f8e301ffffffff5fb770c4de700aca7f74f5e6295f248edafa9423e446d76f4650df9b90f939a700000000494830450220745a8d99c51f98f5c93b8d2f5f14a1f2d8cc42ff7329645681bcafe846cbf50d022100b24e31186129f3ae6cc8a226d1eda389373652a9cf2095631fcc4345067c1ff301ffffffff968d4c096ee861307935d21d797a902b647dc970d3c8374cc13551f8397abbd80000000049483045022100ca65b3f290724d6c56fc333570fa342f2477f34b2a6c93c2e2d7216d9fe9088e022077e259a29ed1f988fab2b9f2ce17a4a56a20c188cadc72bca94e06a73826966501ffffffff0100ba1dd20500000043410497304efd3ab14d0dcbf1e901045a25f4b5dbaf576d074506fd8ded4122ba6f6bec0ed4698ce0e7928c0eaf9ddfb5387929b5d697e82e7aabebe04c10e5c87164ac0000000001000000010d26ba57ff82fefcb43826b45019043e2b6ef9aa8118b7f743167584a7f9cae70000000049483045022024fd7345df2b2bd0e6f8416529046b7d52bda5ffdb70146bc6d72b1ba73cabcd022100ff99c03006cc8f28d92e686f0ae640d20395177f329d0a9dbd560fd2a55aeee701ffffffff0100f2052a01000000434104888d890e1bd84c9e2ac363a9774414a081eb805cd2c0d52e49efc7170ebf342f1cdb284a2e2eb754fc8dd4525fe0caa3d3a525214d0b504dd75376b2f63804a8ac00000000'
BLOCK_586_DIGEST_LX = 'c3f0bb699bcc8a4e0716de45aef74c40aabeb80f7f00b3bdb45e115ee6f5400f'
BLOCK_586_MERKLE = '197b3d968ce463aa5da7d8eeba8af35eba80ded4e4fe6808e6cc0dd1c069594d'


def write(name, root, dtf):
    ctx = BytesSerializationContext()
    dtf.serialize(ctx)
    ots = ctx.getbytes()
    with open(os.path.join(HERE, name + '.root.bin'), 'wb') as f:
        f.write(root)
    with open(os.path.join(HERE, name + '.root.bin.ots'), 'wb') as f:
        f.write(ots)
    # Read it back with the library, as `ots info` would.
    back = DetachedTimestampFile.deserialize(BytesDeserializationContext(ots))
    atts = []
    for msg, att in sorted(back.timestamp.all_attestations(), key=lambda p: repr(p[1])):
        if isinstance(att, BitcoinBlockHeaderAttestation):
            atts.append({'kind': 'bitcoin', 'height': att.height, 'msgHex': b2x(msg), 'merkleRootExplorer': b2lx(msg)})
        elif isinstance(att, PendingAttestation):
            atts.append({'kind': 'pending', 'uri': att.uri, 'msgHex': b2x(msg)})
        else:
            atts.append({'kind': 'unknown', 'tagHex': b2x(att.TAG), 'msgHex': b2x(msg)})
    return {'fileDigestHex': b2x(back.file_digest), 'fileHashOp': str(back.file_hash_op), 'attestations': atts}


expected = {}

# 1. Synthetic: a made-up root and a hand-built tree. The Bitcoin attestation is fake.
root = hashlib.sha256(b'veilcore synthetic batch root for the .ots parser test').digest()
ts = Timestamp(hashlib.sha256(root).digest())
a = ts.ops.add(OpAppend(bytes.fromhex('6e6f6e6365')))         # append "nonce"
b = a.ops.add(OpSHA256())
c = b.ops.add(OpPrepend(bytes(range(40))))                   # a 40-byte prepend
d = c.ops.add(OpSHA256())
d.attestations.add(BitcoinBlockHeaderAttestation(971004))     # FAKE: no real block behind it
e = b.ops.add(OpRIPEMD160())
f = e.ops.add(OpSHA1())
f.attestations.add(PendingAttestation('https://alice.btc.calendar.opentimestamps.org'))
g = ts.ops.add(OpPrepend(b'\x01'))
h = g.ops.add(OpSHA256())
h.attestations.add(UnknownAttestation(bytes.fromhex('0102030405060708'), b'future'))
expected['synthetic'] = write('synthetic', root, DetachedTimestampFile(OpSHA256(), ts))

# 2. Real blocks, from the library's own test data.
for name, block_hex, digest, height, merkle in [
    ('block586', BLOCK_586, lx(BLOCK_586_DIGEST_LX), 586, BLOCK_586_MERKLE),
]:
    block = CBlock.deserialize(x(block_hex))
    stamp = make_timestamp_from_block(digest, block, height)
    (msg, att) = tuple(stamp.all_attestations())[0]
    assert msg == lx(merkle), 'the library disagrees with its own test data'
    # A "root.bin" whose SHA-256 is the digest can't be made, so the file digest here is the
    # transaction id itself, and root.bin is left out: the test checks the walk, not the file.
    out = write(name, b'', DetachedTimestampFile(OpSHA256(), stamp))
    os.remove(os.path.join(HERE, name + '.root.bin'))
    out['headerHex'] = block_hex[:160]
    out['merkleRootFromLibraryTest'] = merkle
    expected[name] = out

# Block 1 has a 65-byte digest (a public key), too long for a .ots file's file digest, so
# it is checked as a header only: its merkle root field, in the library test's byte order.
expected['block1'] = {'headerHex': BLOCK_1[:160], 'merkleRootFromLibraryTest': BLOCK_1_MERKLE}

# 3. Pending only: sent to a calendar, never upgraded.
root2 = hashlib.sha256(b'veilcore pending batch root').digest()
ts2 = Timestamp(hashlib.sha256(root2).digest())
p1 = ts2.ops.add(OpAppend(bytes.fromhex('aa' * 16)))
p2 = p1.ops.add(OpSHA256())
p2.attestations.add(PendingAttestation('https://bob.btc.calendar.opentimestamps.org'))
expected['pending'] = write('pending', root2, DetachedTimestampFile(OpSHA256(), ts2))

with open(os.path.join(HERE, 'expected.json'), 'w') as f:
    json.dump(expected, f, indent=2, sort_keys=True)
    f.write('\n')
print('wrote', sorted(os.listdir(HERE)))

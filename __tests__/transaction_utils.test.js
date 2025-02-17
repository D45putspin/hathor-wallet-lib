/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import transaction from '../src/transaction';
import wallet from '../src/wallet';
import { AddressError, OutputValueError, MaximumNumberParentsError } from '../src/errors';
import buffer from 'buffer';
import { OP_PUSHDATA1 } from '../src/opcodes';
import { DEFAULT_TX_VERSION } from '../src/constants';
import storage from '../src/storage';
import WebSocketHandler from '../src/WebSocketHandler';

const nodeMajorVersion = process.versions.node.split('.')[0];

beforeEach(() => {
  wallet.setConnection(WebSocketHandler);
});


test('calculate tx weight with different parents size', () => {
  const txData = {
    "inputs": [{
      "tx_id": "0000000e340d38d7a5616e3dfb8ac46184b07d59b8e7e61f9ce6e629d7abe8d6",
      "index": 0,
      "token": "00",
      "address": "WR1i8USJWQuaU423fwuFQbezfevmT4vFWX",
      "data": Buffer.from([71, 48])
    }],
    "outputs": [{
      "address": "WR1i8USJWQuaU423fwuFQbezfevmT4vFWX",
      "value": 5400,
      "tokenData": 0,
      "isChange": true
    }, {
      "address": "WR1i8USJWQuaU423fwuFQbezfevmT4vFWX",
      "value": 1000,
      "tokenData": 0
    }],
    "parents": [],
    "tokens": [],
    "weight": 18.65677715840935,
    "nonce": 0,
    "version": 1,
    "timestamp": 1610639352
  };

  transaction.updateTransactionWeightConstants(10, 1.5, 8);

  const expectedWeight = 18.87589824538701;

  // Empty parents array
  expect(transaction.calculateTxWeight(txData)).toBe(expectedWeight);

  // Parents array with one element
  txData.parents.push("0002d4d2a15def7604688e1878ab681142a7b155cbe52a6b4e031250ae96db0a")
  expect(transaction.calculateTxWeight(txData)).toBe(expectedWeight);

  // Parents array with two elements
  txData.parents.push("0002ad8d1519daaddc8e1a37b14aac0b045129c01832281fb1c02d873c7abbf9")
  expect(transaction.calculateTxWeight(txData)).toBe(expectedWeight);

  // Parents array with three elements
  txData.parents.push("0002ad8d1519daaddc8e1a37b14aac0b045129c01832281fb1c02d873c7abbf9")
  expect(() => transaction.calculateTxWeight(txData)).toThrowError(MaximumNumberParentsError);
});

test('Tx weight constants', () => {
  transaction.updateTransactionWeightConstants(10, 1.5, 8);
  let constants = transaction.getTransactionWeightConstants();
  expect(constants.txMinWeight).toBe(10);
  expect(constants.txWeightCoefficient).toBe(1.5);
  expect(constants.txMinWeightK).toBe(8);

  transaction.updateTransactionWeightConstants(15, 1.2, 10);
  constants = transaction.getTransactionWeightConstants();
  expect(constants.txMinWeight).toBe(15);
  expect(constants.txWeightCoefficient).toBe(1.2);
  expect(constants.txMinWeightK).toBe(10);
});

test('Tx max inputs and outputs constant', () => {
  transaction.updateMaxInputsConstant(255);
  const maxInputs = transaction.getMaxInputsConstant();
  expect(maxInputs).toBe(255);

  transaction.updateMaxOutputsConstant(255);
  const maxOutputs = transaction.getMaxOutputsConstant();
  expect(maxOutputs).toBe(255);
});

test('Unsigned int to bytes', () => {
  let number1 = 10;
  let buf1 = transaction.intToBytes(number1, 1);
  expect(buf1.readUInt8(0)).toBe(number1);

  let number2 = 300;
  let buf2 = transaction.intToBytes(number2, 2);
  expect(buf2.readUInt16BE(0)).toBe(number2);

  let number3 = 70000;
  let buf3 = transaction.intToBytes(number3, 4);
  expect(buf3.readUInt32BE(0)).toBe(number3);
});

test('Signed int to bytes', () => {
  let number1 = 10;
  let buf1 = transaction.signedIntToBytes(number1, 1);
  expect(buf1.readInt8(0)).toBe(number1);

  let number2 = 300;
  let buf2 = transaction.signedIntToBytes(number2, 2);
  expect(buf2.readInt16BE(0)).toBe(number2);

  let number3 = 70000;
  let buf3 = transaction.signedIntToBytes(number3, 4);
  expect(buf3.readInt32BE(0)).toBe(number3);

  let number4 = 2**33;
  let buf4 = transaction.signedIntToBytes(number4, 8);
  if (nodeMajorVersion > 8) {
    expect(buf4.readBigInt64BE(0)).toBe(BigInt(number4));
  } else {
    expect(buf4.readIntBE(0, 8)).toBe(number4);
  }
});

test('Float to bytes', () => {
  let number = 10.5;
  let buffer = transaction.floatToBytes(number, 8);
  expect(buffer.readDoubleBE(0)).toBe(number);
});

test('Output value to bytes', () => {
  let bytes1 = transaction.outputValueToBytes(100);
  expect(bytes1.length).toBe(4);
  expect(bytes1.readIntBE(0, 4)).toBe(100);

  let bytes2 = transaction.outputValueToBytes(2**31-1);
  expect(bytes2.length).toBe(4);
  expect(bytes2.readIntBE(0, 4)).toBe(2**31-1);

  let bytes3 = transaction.outputValueToBytes(2**31);
  expect(bytes3.length).toBe(8);
  const expectedNumber3 = -(2**31);
  if (nodeMajorVersion > 8) {
    expect(bytes3.readBigInt64BE(0)).toBe(BigInt(expectedNumber3));
  } else {
    expect(bytes3.readIntBE(0, 8)).toBe(expectedNumber3);
  }

  let bytes4 = transaction.outputValueToBytes(2**33);
  const expectedNumber4 = -(2**33);
  expect(bytes4.length).toBe(8);
  if (nodeMajorVersion > 8) {
    expect(bytes4.readBigInt64BE(0)).toBe(BigInt(expectedNumber4));
  } else {
    expect(bytes4.readIntBE(0, 8)).toBe(expectedNumber4);
  }

  const outputValueLarge = () => {
    transaction.outputValueToBytes(2**60);
  }
  expect(outputValueLarge).toThrowError(OutputValueError);
});

test('Decode address', () => {
  let addressB58 = '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR7j';
  let expectedHex = '000ad2c15b8afe6598da1d327951043cf7ad057bcfc03c8936';
  let decoded = transaction.decodeAddress(addressB58);
  expect(expectedHex).toBe(decoded.toString('hex'));

  const decodeAddressWrong = () => {
    let wrongAddressB58 = 'asfli';
    transaction.decodeAddress(wrongAddressB58);
  }
  expect(decodeAddressWrong).toThrowError(AddressError);
});

test('Validate address', () => {
  let addressB58 = 'WgSpcCwYAbtt31S2cqU7hHJkUHdac2EPWG';
  let decoded = transaction.decodeAddress(addressB58);
  expect(transaction.validateAddress(addressB58, decoded)).toBeTruthy();

  let wrongAddressB58 = 'EETJWa3U6fBm8eUXbG7ddj6k4KjoR7j';
  let decodedWrong = transaction.decodeAddress(wrongAddressB58);
  // https://jestjs.io/docs/en/expect#tothrowerror
  // Note: You must wrap the code in a function, otherwise the error will not be caught and the assertion will fail.
  const validateAddressWrong = () => {
    transaction.validateAddress(wrongAddressB58, decodedWrong);
  }
  expect(validateAddressWrong).toThrowError(AddressError);

  let wrong2AddressB58 = '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR77';
  let decodedWrong2 = transaction.decodeAddress(wrong2AddressB58);
  const validateAddressWrong2 = () => {
    transaction.validateAddress(wrong2AddressB58, decodedWrong2);
  }
  expect(validateAddressWrong2).toThrowError(AddressError);

  let wrong3AddressB58 = '1zEETJWa3U6fBm8eUXbG7ddj6k4KjoR7j';
  let decodedWrong3 = transaction.decodeAddress(wrong3AddressB58);
  const validateAddressWrong3 = () => {
    transaction.validateAddress(wrong3AddressB58, decodedWrong3);
  }
  expect(validateAddressWrong3).toThrowError(AddressError);
});

test('Push data', () => {
  let stack = [];
  let buf = buffer.Buffer.alloc(5);
  transaction.pushDataToStack(stack, buf);
  expect(stack.length).toBe(2);
  expect(stack[0].readUInt8(0)).toBe(5);
  expect(stack[1]).toBe(buf);

  let newStack = [];
  let newBuf = buffer.Buffer.alloc(100);
  transaction.pushDataToStack(newStack, newBuf);
  expect(newStack.length).toBe(3);
  expect(newStack[0]).toBe(OP_PUSHDATA1);
  expect(newStack[1].readUInt8(0)).toBe(100);
  expect(newStack[2]).toBe(newBuf);
});

test('Create output script', () => {
  let address = 'WR1i8USJWQuaU423fwuFQbezfevmT4vFWX';
  let expectedHex = '76a91419a8eb751eab5a13027e8cae215f6a5dafc1a8dd88ac';
  // p2pkh is default
  expect(transaction.createOutputScript({ address }).toString('hex')).toBe(expectedHex);
  // p2pkh
  expect(transaction.createOutputScript({ address, type: 'p2pkh'}).toString('hex')).toBe(expectedHex);

  let timestamp = 1550249803;
  let expectedHex2 = '045c66ef4b6f76a91419a8eb751eab5a13027e8cae215f6a5dafc1a8dd88ac';
  expect(transaction.createOutputScript({ address, timelock: timestamp }).toString('hex')).toBe(expectedHex2);

  // p2sh outputs
  let p2shAddress = 'wcFwC82mLoUudtgakZGMPyTL2aHcgSJgDZ';
  let expectedHex3 = 'a914b6696aed0a1ef8fe7d604f5436ec6617e6ad92d387'
  expect(transaction.createOutputScript({ address: p2shAddress, type: 'p2sh' }).toString('hex')).toBe(expectedHex3);

  let expectedHex4 = '045c66ef4b6fa914b6696aed0a1ef8fe7d604f5436ec6617e6ad92d387'
  expect(transaction.createOutputScript({ address: p2shAddress, timelock: timestamp, type: 'p2sh' }).toString('hex')).toBe(expectedHex4);

  // data outputs
  let data = '123';
  let expectedHex5 = '03313233ac';
  expect(transaction.createOutputScript({ data, type: 'data' }).toString('hex')).toBe(expectedHex5);
});

test('Create input data', () => {
  let signature = buffer.Buffer.alloc(20);
  let pubkeyBytes = buffer.Buffer.alloc(30);
  expect(transaction.createInputData(signature, pubkeyBytes).length).toBe(52);

  // Pubkey bytes now needs the OP_PUSHDATA1 to be pushed
  let pubkeyBytes2 = buffer.Buffer.alloc(100);
  expect(transaction.createInputData(signature, pubkeyBytes2).length).toBe(123);
});

test('Calculate outputs sum', () => {
  let outputs = [];
  outputs.push({'address': 'a', value: 5, tokenData: 0}); // regular htr transfer
  outputs.push({'address': 'a', value: 4, tokenData: 1}); // regular token transfer
  outputs.push({'address': 'a', value: 3, tokenData: 0b10000001});  // token authority transfer
  expect(transaction.getOutputsSum(outputs)).toBe(9);
});

test('Prepare data to send tokens', async (done) => {
  // Now we will update the data in the inputs
  let words = 'purse orchard camera cloud piece joke hospital mechanic timber horror shoulder rebuild you decrease garlic derive rebuild random naive elbow depart okay parrot cliff';
  // Generate new wallet and save data in storage
  await wallet.executeGenerateWallet(words, '', '123456', 'password', true);
  // Adding data to storage to be used in the signing process
  let savedData = storage.getItem('wallet:data');
  let addr = storage.getItem('wallet:address');
  savedData['historyTransactions'] = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e': {
      'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e',
      'outputs': [
        {
          'decoded': {
            'address': addr
          },
          'value': 1000,
        },
      ]
    }
  };
  storage.setItem('wallet:data', savedData);

  // First get data to sign
  let tx_id = '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e';
  let txData = {
    'inputs': [
      {
        'tx_id': tx_id,
        'index': 0,
        'token': '00',
        'address': addr,
      }
    ],
    'outputs': [
      {
        'address': 'WR1i8USJWQuaU423fwuFQbezfevmT4vFWX',
        'value': 1000,
        'timelock': null
      },
      {
        'address': 'WgSpcCwYAbtt31S2cqU7hHJkUHdac2EPWG',
        'value': 1000,
        'timelock': 1550249803
      }
    ],
    'tokens': ['123'],
  }
  let txDataClone = Object.assign({}, txData);
  let expectedDataToSignHex = '00000101021200034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e000000000003e800001976a91419a8eb751eab5a13027e8cae215f6a5dafc1a8dd88ac000003e800001f045c66ef4b6f76a914c2f29cfdb73822200a07ab51d261b425af811fed88ac';
  let dataToSign = transaction.dataToSign(txData);
  expect(dataToSign.toString('hex')).toBe(expectedDataToSignHex);

  txData = transaction.signTx(txData, dataToSign, '123456');
  expect(txData['inputs'][0].data).not.toBe(undefined);
  expect(txData['inputs'][0].data.length > 0).toBeTruthy();

  transaction.completeTx(txData);
  transaction.setWeightIfNeeded(txData);
  expect(txData['nonce']).toBe(0);
  expect(txData['version']).toBe(DEFAULT_TX_VERSION);
  expect(txData['timestamp'] > 0).toBeTruthy();
  expect(txData['weight'] > 0).toBeTruthy();

  // Fixing timestamp to compare the serialization
  txData['timestamp'] = 1550249810;
  let expectedTxHex = '00010101021200034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e0000694630440220317cd233801c1986c2de900bf8d344c6335d3c385e69d19d65e1fae7a0afd0af02207acddb824debf855798d79c45701cbe3a19aea00baad94bff5290c6f0b0acf8e210346cddff43dffab8e13398633ab7a7caf0d634551e89ae6fd563e282f6744b983000003e800001976a91419a8eb751eab5a13027e8cae215f6a5dafc1a8dd88ac000003e800001f045c66ef4b6f76a914c2f29cfdb73822200a07ab51d261b425af811fed88ac4030861b12dcee1a5c66ef520000000000';
  expect(transaction.txToBytes(txData).toString('hex')).toBe(expectedTxHex);

  // Mock any POST request to /thin_wallet/send_tokens
  // arguments for reply are (status, data, headers)
  mock.onPost('thin_wallet/send_tokens').reply((config) => {
    const ret = {
      'success': true,
      'tx': {
        'hash': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
      }
    }
    return [200, ret];
  });

  const promise = transaction.sendTransaction(txDataClone, '123456');
  promise.then(() => {
    done();
  }, () => {
    done.fail('Error sending transaction');
  });
}, 10000);

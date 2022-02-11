/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { hexToBuffer } from './utils/buffer';

/**
 * Opcodes used to generate output script
 * @module Opcodes
 */

/**
 * Checks if timestamp is greater than a value
 */
export const OP_GREATERTHAN_TIMESTAMP = hexToBuffer('6f');

/**
 * Duplicates value
 */
export const OP_DUP = hexToBuffer('76');

/**
 * Calculates hash160 of value
 */
export const OP_HASH160 = hexToBuffer('a9');

/**
 * Check if values are equal and push 1 to the stack
 * in case it is and 0 if not
 */
export const OP_EQUAL = hexToBuffer('87');

/**
 * Verifies if values are equal
 */
export const OP_EQUALVERIFY = hexToBuffer('88');

/**
 * Verifies signature
 */
export const OP_CHECKSIG = hexToBuffer('ac');

/**
 * Shows that pushdata will need length value
 */
export const OP_PUSHDATA1 = hexToBuffer('4c');

export const OP_2 = hexToBuffer('52');
export const OP_3 = hexToBuffer('53');
export const OP_CHECKMULTISIG = hexToBuffer('ae');

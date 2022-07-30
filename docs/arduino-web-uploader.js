/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./dist/Serial.js":
/*!************************!*\
  !*** ./dist/Serial.js ***!
  \************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

        "use strict";

        Object.defineProperty(exports, "__esModule", ({ value: true }));
        exports.Serial = void 0;
        const readable_web_to_node_stream_1 = __webpack_require__(/*! readable-web-to-node-stream */ "./node_modules/readable-web-to-node-stream/lib/index.js");
        class Serial {
          async close() {
            if (this.reader) {
              const reader = this.reader;
              this.reader = undefined;
              // @ts-ignore
              // this is specific to the "readable-web-to-node-stream" library
              await reader.reader.cancel();
              // await this.reader.close() // this blocks if uploading failed
            }
            if (this.writer) {
              const writer = this.writer;
              this.writer = undefined;
              await writer.close();
            }
            if (this.port) {
              const port = this.port;
              this.port = undefined;
              await port.close();
            }
          }
          async connectWithPaired(options) {
            const [port] = await navigator.serial.getPorts();
            if (!port)
              throw new Error('no paired');
            return this._connect(options, port);
          }
          async connect(options, portFilters = {}) {
            const port = await navigator.serial.requestPort(portFilters);
            return this._connect(options, port);
          }
          async _connect(options, port) {
            options = {
              baudRate: 9600,
              dataBits: 8,
              stopBits: 1,
              parity: 'none',
              bufferSize: 255,
              rtscts: false,
              xon: false,
              xoff: false,
              ...options,
            };
            if (this.port)
              await this.close();
            this.port = port;
            await this.port.open(options);
            this.reader = new readable_web_to_node_stream_1.ReadableWebToNodeStream(this.port.readable);
            this.writer = this.port.writable.getWriter();
            // next I'm faking a NodeJS.ReadWriteStream
            const rwStream = this.reader;
            // @ts-ignore
            rwStream.write = (buffer, onDone) => {
              this.writer.write(buffer).then(() => onDone(null), onDone);
              return true;
            };
            return rwStream;
          }
        }
        exports.Serial = Serial;
        const serial = new Serial();
        exports["default"] = serial;
        //# sourceMappingURL=Serial.js.map

        /***/
      }),

/***/ "./dist/index.js":
/*!***********************!*\
  !*** ./dist/index.js ***!
  \***********************/
/***/ (function (__unused_webpack_module, exports, __webpack_require__) {

        "use strict";
/* provided dependency */ var Buffer = __webpack_require__(/*! buffer */ "./node_modules/buffer/index.js")["Buffer"];

        var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
        }) : (function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        }));
        var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
          Object.defineProperty(o, "default", { enumerable: true, value: v });
        }) : function (o, v) {
          o["default"] = v;
        });
        var __importStar = (this && this.__importStar) || function (mod) {
          if (mod && mod.__esModule) return mod;
          var result = {};
          if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
          __setModuleDefault(result, mod);
          return result;
        };
        var __importDefault = (this && this.__importDefault) || function (mod) {
          return (mod && mod.__esModule) ? mod : { "default": mod };
        };
        Object.defineProperty(exports, "__esModule", ({ value: true }));
        exports.upload = exports.boards = void 0;
        const Serial_1 = __importDefault(__webpack_require__(/*! ./Serial */ "./dist/Serial.js"));
        const async_1 = __importDefault(__webpack_require__(/*! async */ "./node_modules/async/dist/async.mjs"));
        const intel_hex = __importStar(__webpack_require__(/*! intel-hex */ "./node_modules/intel-hex/index.js"));
        const stk500_1 = __importDefault(__webpack_require__(/*! stk500 */ "./node_modules/stk500/index.js"));
        const { version } = __webpack_require__(/*! ../package.json */ "./package.json");
        exports.boards = {
          avr4809: {
            signature: Buffer.from([0x1e, 0x96, 0x51]),
            pageSize: 128,
            timeout: 400,
            baudRate: 115200,
            use_8_bit_addresseses: true,
          },
          lgt8f328p: {
            signature: Buffer.from([0x1e, 0x95, 0x0f]),
            pageSize: 128,
            timeout: 400,
            baudRate: 57600,
          },
          nanoOldBootloader: {
            signature: Buffer.from([0x1e, 0x95, 0x0f]),
            pageSize: 128,
            timeout: 400,
            baudRate: 57600,
          },
          nano: {
            signature: Buffer.from([0x1e, 0x95, 0x0f]),
            pageSize: 128,
            timeout: 400,
            baudRate: 115200,
          },
          uno: {
            signature: Buffer.from([0x1e, 0x95, 0x0f]),
            pageSize: 128,
            timeout: 400,
            baudRate: 115200,
          },
          proMini: {
            signature: Buffer.from([0x1e, 0x95, 0x0f]),
            pageSize: 128,
            timeout: 400,
            baudRate: 115200,
          },
        };
        const noop = (callback) => callback();
        console.log("Arduino Web Uploader https://github.com/dbuezas/arduino-web-uploader");
        async function upload(board, hexFileHref, onProgress, verify = false, portFilters = {}) {
          try {
            const text = await fetch(hexFileHref)
              .then((response) => response.text());
            let { data: hex } = intel_hex.parse(text);
            const serialStream = await Serial_1.default.connect({ baudRate: board.baudRate }, portFilters);
            onProgress(0);
            const stk500 = new stk500_1.default();
            let sent = 0;
            let total = hex.length / board.pageSize;
            if (verify)
              total *= 2;
            stk500.log = (what) => {
              if (what === 'page done' || what === 'verify done') {
                sent += 1;
                const percent = Math.round((100 * sent) / total);
                onProgress(percent);
              }
              console.log(what, sent, total, hex.length, board.pageSize);
            };
            await async_1.default.series([
              // send two dummy syncs like avrdude does
              stk500.sync.bind(stk500, serialStream, 3, board.timeout),
              stk500.sync.bind(stk500, serialStream, 3, board.timeout),
              stk500.sync.bind(stk500, serialStream, 3, board.timeout),
              stk500.verifySignature.bind(stk500, serialStream, board.signature, board.timeout),
              stk500.setOptions.bind(stk500, serialStream, {}, board.timeout),
              stk500.enterProgrammingMode.bind(stk500, serialStream, board.timeout),
              stk500.upload.bind(stk500, serialStream, hex, board.pageSize, board.timeout, board.use_8_bit_addresseses),
              !verify ? noop : stk500.verify.bind(stk500, serialStream, hex, board.pageSize, board.timeout, board.use_8_bit_addresseses),
              stk500.exitProgrammingMode.bind(stk500, serialStream, board.timeout),
            ]);
          }
          finally {
            Serial_1.default.close();
          }
        }
        exports.upload = upload;
        exports["default"] = upload;
        //# sourceMappingURL=index.js.map

        /***/
      }),

/***/ "./node_modules/base64-js/index.js":
/*!*****************************************!*\
  !*** ./node_modules/base64-js/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, exports) => {

        "use strict";


        exports.byteLength = byteLength
        exports.toByteArray = toByteArray
        exports.fromByteArray = fromByteArray

        var lookup = []
        var revLookup = []
        var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

        var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        for (var i = 0, len = code.length; i < len; ++i) {
          lookup[i] = code[i]
          revLookup[code.charCodeAt(i)] = i
        }

        // Support decoding URL-safe base64 strings, as Node.js does.
        // See: https://en.wikipedia.org/wiki/Base64#URL_applications
        revLookup['-'.charCodeAt(0)] = 62
        revLookup['_'.charCodeAt(0)] = 63

        function getLens(b64) {
          var len = b64.length

          if (len % 4 > 0) {
            throw new Error('Invalid string. Length must be a multiple of 4')
          }

          // Trim off extra bytes after placeholder bytes are found
          // See: https://github.com/beatgammit/base64-js/issues/42
          var validLen = b64.indexOf('=')
          if (validLen === -1) validLen = len

          var placeHoldersLen = validLen === len
            ? 0
            : 4 - (validLen % 4)

          return [validLen, placeHoldersLen]
        }

        // base64 is 4/3 + up to two characters of the original data
        function byteLength(b64) {
          var lens = getLens(b64)
          var validLen = lens[0]
          var placeHoldersLen = lens[1]
          return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
        }

        function _byteLength(b64, validLen, placeHoldersLen) {
          return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
        }

        function toByteArray(b64) {
          var tmp
          var lens = getLens(b64)
          var validLen = lens[0]
          var placeHoldersLen = lens[1]

          var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

          var curByte = 0

          // if there are placeholders, only get up to the last complete 4 chars
          var len = placeHoldersLen > 0
            ? validLen - 4
            : validLen

          var i
          for (i = 0; i < len; i += 4) {
            tmp =
              (revLookup[b64.charCodeAt(i)] << 18) |
              (revLookup[b64.charCodeAt(i + 1)] << 12) |
              (revLookup[b64.charCodeAt(i + 2)] << 6) |
              revLookup[b64.charCodeAt(i + 3)]
            arr[curByte++] = (tmp >> 16) & 0xFF
            arr[curByte++] = (tmp >> 8) & 0xFF
            arr[curByte++] = tmp & 0xFF
          }

          if (placeHoldersLen === 2) {
            tmp =
              (revLookup[b64.charCodeAt(i)] << 2) |
              (revLookup[b64.charCodeAt(i + 1)] >> 4)
            arr[curByte++] = tmp & 0xFF
          }

          if (placeHoldersLen === 1) {
            tmp =
              (revLookup[b64.charCodeAt(i)] << 10) |
              (revLookup[b64.charCodeAt(i + 1)] << 4) |
              (revLookup[b64.charCodeAt(i + 2)] >> 2)
            arr[curByte++] = (tmp >> 8) & 0xFF
            arr[curByte++] = tmp & 0xFF
          }

          return arr
        }

        function tripletToBase64(num) {
          return lookup[num >> 18 & 0x3F] +
            lookup[num >> 12 & 0x3F] +
            lookup[num >> 6 & 0x3F] +
            lookup[num & 0x3F]
        }

        function encodeChunk(uint8, start, end) {
          var tmp
          var output = []
          for (var i = start; i < end; i += 3) {
            tmp =
              ((uint8[i] << 16) & 0xFF0000) +
              ((uint8[i + 1] << 8) & 0xFF00) +
              (uint8[i + 2] & 0xFF)
            output.push(tripletToBase64(tmp))
          }
          return output.join('')
        }

        function fromByteArray(uint8) {
          var tmp
          var len = uint8.length
          var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
          var parts = []
          var maxChunkLength = 16383 // must be multiple of 3

          // go through the array every three bytes, we'll deal with trailing stuff later
          for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
            parts.push(encodeChunk(
              uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
            ))
          }

          // pad the end with zeros, but make sure to not forget the extra bytes
          if (extraBytes === 1) {
            tmp = uint8[len - 1]
            parts.push(
              lookup[tmp >> 2] +
              lookup[(tmp << 4) & 0x3F] +
              '=='
            )
          } else if (extraBytes === 2) {
            tmp = (uint8[len - 2] << 8) + uint8[len - 1]
            parts.push(
              lookup[tmp >> 10] +
              lookup[(tmp >> 4) & 0x3F] +
              lookup[(tmp << 2) & 0x3F] +
              '='
            )
          }

          return parts.join('')
        }


        /***/
      }),

/***/ "./node_modules/buffer/index.js":
/*!**************************************!*\
  !*** ./node_modules/buffer/index.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

        "use strict";
        /*!
         * The buffer module from node.js, for the browser.
         *
         * @author   Feross Aboukhadijeh <https://feross.org>
         * @license  MIT
         */
        /* eslint-disable no-proto */



        var base64 = __webpack_require__(/*! base64-js */ "./node_modules/base64-js/index.js")
        var ieee754 = __webpack_require__(/*! ieee754 */ "./node_modules/ieee754/index.js")
        var customInspectSymbol =
          (typeof Symbol === 'function' && typeof Symbol.for === 'function')
            ? Symbol.for('nodejs.util.inspect.custom')
            : null

        exports.Buffer = Buffer
        exports.SlowBuffer = SlowBuffer
        exports.INSPECT_MAX_BYTES = 50

        var K_MAX_LENGTH = 0x7fffffff
        exports.kMaxLength = K_MAX_LENGTH

        /**
         * If `Buffer.TYPED_ARRAY_SUPPORT`:
         *   === true    Use Uint8Array implementation (fastest)
         *   === false   Print warning and recommend using `buffer` v4.x which has an Object
         *               implementation (most compatible, even IE6)
         *
         * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
         * Opera 11.6+, iOS 4.2+.
         *
         * We report that the browser does not support typed arrays if the are not subclassable
         * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
         * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
         * for __proto__ and has a buggy typed array implementation.
         */
        Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

        if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
          typeof console.error === 'function') {
          console.error(
            'This browser lacks typed array (Uint8Array) support which is required by ' +
            '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
          )
        }

        function typedArraySupport() {
          // Can typed array instances can be augmented?
          try {
            var arr = new Uint8Array(1)
            var proto = { foo: function () { return 42 } }
            Object.setPrototypeOf(proto, Uint8Array.prototype)
            Object.setPrototypeOf(arr, proto)
            return arr.foo() === 42
          } catch (e) {
            return false
          }
        }

        Object.defineProperty(Buffer.prototype, 'parent', {
          enumerable: true,
          get: function () {
            if (!Buffer.isBuffer(this)) return undefined
            return this.buffer
          }
        })

        Object.defineProperty(Buffer.prototype, 'offset', {
          enumerable: true,
          get: function () {
            if (!Buffer.isBuffer(this)) return undefined
            return this.byteOffset
          }
        })

        function createBuffer(length) {
          if (length > K_MAX_LENGTH) {
            throw new RangeError('The value "' + length + '" is invalid for option "size"')
          }
          // Return an augmented `Uint8Array` instance
          var buf = new Uint8Array(length)
          Object.setPrototypeOf(buf, Buffer.prototype)
          return buf
        }

        /**
         * The Buffer constructor returns instances of `Uint8Array` that have their
         * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
         * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
         * and the `Uint8Array` methods. Square bracket notation works as expected -- it
         * returns a single octet.
         *
         * The `Uint8Array` prototype remains unmodified.
         */

        function Buffer(arg, encodingOrOffset, length) {
          // Common case.
          if (typeof arg === 'number') {
            if (typeof encodingOrOffset === 'string') {
              throw new TypeError(
                'The "string" argument must be of type string. Received type number'
              )
            }
            return allocUnsafe(arg)
          }
          return from(arg, encodingOrOffset, length)
        }

        Buffer.poolSize = 8192 // not used by this implementation

        function from(value, encodingOrOffset, length) {
          if (typeof value === 'string') {
            return fromString(value, encodingOrOffset)
          }

          if (ArrayBuffer.isView(value)) {
            return fromArrayLike(value)
          }

          if (value == null) {
            throw new TypeError(
              'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
              'or Array-like Object. Received type ' + (typeof value)
            )
          }

          if (isInstance(value, ArrayBuffer) ||
            (value && isInstance(value.buffer, ArrayBuffer))) {
            return fromArrayBuffer(value, encodingOrOffset, length)
          }

          if (typeof SharedArrayBuffer !== 'undefined' &&
            (isInstance(value, SharedArrayBuffer) ||
              (value && isInstance(value.buffer, SharedArrayBuffer)))) {
            return fromArrayBuffer(value, encodingOrOffset, length)
          }

          if (typeof value === 'number') {
            throw new TypeError(
              'The "value" argument must not be of type number. Received type number'
            )
          }

          var valueOf = value.valueOf && value.valueOf()
          if (valueOf != null && valueOf !== value) {
            return Buffer.from(valueOf, encodingOrOffset, length)
          }

          var b = fromObject(value)
          if (b) return b

          if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
            typeof value[Symbol.toPrimitive] === 'function') {
            return Buffer.from(
              value[Symbol.toPrimitive]('string'), encodingOrOffset, length
            )
          }

          throw new TypeError(
            'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
            'or Array-like Object. Received type ' + (typeof value)
          )
        }

        /**
         * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
         * if value is a number.
         * Buffer.from(str[, encoding])
         * Buffer.from(array)
         * Buffer.from(buffer)
         * Buffer.from(arrayBuffer[, byteOffset[, length]])
         **/
        Buffer.from = function (value, encodingOrOffset, length) {
          return from(value, encodingOrOffset, length)
        }

        // Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
        // https://github.com/feross/buffer/pull/148
        Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
        Object.setPrototypeOf(Buffer, Uint8Array)

        function assertSize(size) {
          if (typeof size !== 'number') {
            throw new TypeError('"size" argument must be of type number')
          } else if (size < 0) {
            throw new RangeError('The value "' + size + '" is invalid for option "size"')
          }
        }

        function alloc(size, fill, encoding) {
          assertSize(size)
          if (size <= 0) {
            return createBuffer(size)
          }
          if (fill !== undefined) {
            // Only pay attention to encoding if it's a string. This
            // prevents accidentally sending in a number that would
            // be interpretted as a start offset.
            return typeof encoding === 'string'
              ? createBuffer(size).fill(fill, encoding)
              : createBuffer(size).fill(fill)
          }
          return createBuffer(size)
        }

        /**
         * Creates a new filled Buffer instance.
         * alloc(size[, fill[, encoding]])
         **/
        Buffer.alloc = function (size, fill, encoding) {
          return alloc(size, fill, encoding)
        }

        function allocUnsafe(size) {
          assertSize(size)
          return createBuffer(size < 0 ? 0 : checked(size) | 0)
        }

        /**
         * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
         * */
        Buffer.allocUnsafe = function (size) {
          return allocUnsafe(size)
        }
        /**
         * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
         */
        Buffer.allocUnsafeSlow = function (size) {
          return allocUnsafe(size)
        }

        function fromString(string, encoding) {
          if (typeof encoding !== 'string' || encoding === '') {
            encoding = 'utf8'
          }

          if (!Buffer.isEncoding(encoding)) {
            throw new TypeError('Unknown encoding: ' + encoding)
          }

          var length = byteLength(string, encoding) | 0
          var buf = createBuffer(length)

          var actual = buf.write(string, encoding)

          if (actual !== length) {
            // Writing a hex string, for example, that contains invalid characters will
            // cause everything after the first invalid character to be ignored. (e.g.
            // 'abxxcd' will be treated as 'ab')
            buf = buf.slice(0, actual)
          }

          return buf
        }

        function fromArrayLike(array) {
          var length = array.length < 0 ? 0 : checked(array.length) | 0
          var buf = createBuffer(length)
          for (var i = 0; i < length; i += 1) {
            buf[i] = array[i] & 255
          }
          return buf
        }

        function fromArrayBuffer(array, byteOffset, length) {
          if (byteOffset < 0 || array.byteLength < byteOffset) {
            throw new RangeError('"offset" is outside of buffer bounds')
          }

          if (array.byteLength < byteOffset + (length || 0)) {
            throw new RangeError('"length" is outside of buffer bounds')
          }

          var buf
          if (byteOffset === undefined && length === undefined) {
            buf = new Uint8Array(array)
          } else if (length === undefined) {
            buf = new Uint8Array(array, byteOffset)
          } else {
            buf = new Uint8Array(array, byteOffset, length)
          }

          // Return an augmented `Uint8Array` instance
          Object.setPrototypeOf(buf, Buffer.prototype)

          return buf
        }

        function fromObject(obj) {
          if (Buffer.isBuffer(obj)) {
            var len = checked(obj.length) | 0
            var buf = createBuffer(len)

            if (buf.length === 0) {
              return buf
            }

            obj.copy(buf, 0, 0, len)
            return buf
          }

          if (obj.length !== undefined) {
            if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
              return createBuffer(0)
            }
            return fromArrayLike(obj)
          }

          if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
            return fromArrayLike(obj.data)
          }
        }

        function checked(length) {
          // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
          // length is NaN (which is otherwise coerced to zero.)
          if (length >= K_MAX_LENGTH) {
            throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
              'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
          }
          return length | 0
        }

        function SlowBuffer(length) {
          if (+length != length) { // eslint-disable-line eqeqeq
            length = 0
          }
          return Buffer.alloc(+length)
        }

        Buffer.isBuffer = function isBuffer(b) {
          return b != null && b._isBuffer === true &&
            b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
        }

        Buffer.compare = function compare(a, b) {
          if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
          if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
          if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
            throw new TypeError(
              'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
            )
          }

          if (a === b) return 0

          var x = a.length
          var y = b.length

          for (var i = 0, len = Math.min(x, y); i < len; ++i) {
            if (a[i] !== b[i]) {
              x = a[i]
              y = b[i]
              break
            }
          }

          if (x < y) return -1
          if (y < x) return 1
          return 0
        }

        Buffer.isEncoding = function isEncoding(encoding) {
          switch (String(encoding).toLowerCase()) {
            case 'hex':
            case 'utf8':
            case 'utf-8':
            case 'ascii':
            case 'latin1':
            case 'binary':
            case 'base64':
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
              return true
            default:
              return false
          }
        }

        Buffer.concat = function concat(list, length) {
          if (!Array.isArray(list)) {
            throw new TypeError('"list" argument must be an Array of Buffers')
          }

          if (list.length === 0) {
            return Buffer.alloc(0)
          }

          var i
          if (length === undefined) {
            length = 0
            for (i = 0; i < list.length; ++i) {
              length += list[i].length
            }
          }

          var buffer = Buffer.allocUnsafe(length)
          var pos = 0
          for (i = 0; i < list.length; ++i) {
            var buf = list[i]
            if (isInstance(buf, Uint8Array)) {
              buf = Buffer.from(buf)
            }
            if (!Buffer.isBuffer(buf)) {
              throw new TypeError('"list" argument must be an Array of Buffers')
            }
            buf.copy(buffer, pos)
            pos += buf.length
          }
          return buffer
        }

        function byteLength(string, encoding) {
          if (Buffer.isBuffer(string)) {
            return string.length
          }
          if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
            return string.byteLength
          }
          if (typeof string !== 'string') {
            throw new TypeError(
              'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
              'Received type ' + typeof string
            )
          }

          var len = string.length
          var mustMatch = (arguments.length > 2 && arguments[2] === true)
          if (!mustMatch && len === 0) return 0

          // Use a for loop to avoid recursion
          var loweredCase = false
          for (; ;) {
            switch (encoding) {
              case 'ascii':
              case 'latin1':
              case 'binary':
                return len
              case 'utf8':
              case 'utf-8':
                return utf8ToBytes(string).length
              case 'ucs2':
              case 'ucs-2':
              case 'utf16le':
              case 'utf-16le':
                return len * 2
              case 'hex':
                return len >>> 1
              case 'base64':
                return base64ToBytes(string).length
              default:
                if (loweredCase) {
                  return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
                }
                encoding = ('' + encoding).toLowerCase()
                loweredCase = true
            }
          }
        }
        Buffer.byteLength = byteLength

        function slowToString(encoding, start, end) {
          var loweredCase = false

          // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
          // property of a typed array.

          // This behaves neither like String nor Uint8Array in that we set start/end
          // to their upper/lower bounds if the value passed is out of range.
          // undefined is handled specially as per ECMA-262 6th Edition,
          // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
          if (start === undefined || start < 0) {
            start = 0
          }
          // Return early if start > this.length. Done here to prevent potential uint32
          // coercion fail below.
          if (start > this.length) {
            return ''
          }

          if (end === undefined || end > this.length) {
            end = this.length
          }

          if (end <= 0) {
            return ''
          }

          // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
          end >>>= 0
          start >>>= 0

          if (end <= start) {
            return ''
          }

          if (!encoding) encoding = 'utf8'

          while (true) {
            switch (encoding) {
              case 'hex':
                return hexSlice(this, start, end)

              case 'utf8':
              case 'utf-8':
                return utf8Slice(this, start, end)

              case 'ascii':
                return asciiSlice(this, start, end)

              case 'latin1':
              case 'binary':
                return latin1Slice(this, start, end)

              case 'base64':
                return base64Slice(this, start, end)

              case 'ucs2':
              case 'ucs-2':
              case 'utf16le':
              case 'utf-16le':
                return utf16leSlice(this, start, end)

              default:
                if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
                encoding = (encoding + '').toLowerCase()
                loweredCase = true
            }
          }
        }

        // This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
        // to detect a Buffer instance. It's not possible to use `instanceof Buffer`
        // reliably in a browserify context because there could be multiple different
        // copies of the 'buffer' package in use. This method works even for Buffer
        // instances that were created from another copy of the `buffer` package.
        // See: https://github.com/feross/buffer/issues/154
        Buffer.prototype._isBuffer = true

        function swap(b, n, m) {
          var i = b[n]
          b[n] = b[m]
          b[m] = i
        }

        Buffer.prototype.swap16 = function swap16() {
          var len = this.length
          if (len % 2 !== 0) {
            throw new RangeError('Buffer size must be a multiple of 16-bits')
          }
          for (var i = 0; i < len; i += 2) {
            swap(this, i, i + 1)
          }
          return this
        }

        Buffer.prototype.swap32 = function swap32() {
          var len = this.length
          if (len % 4 !== 0) {
            throw new RangeError('Buffer size must be a multiple of 32-bits')
          }
          for (var i = 0; i < len; i += 4) {
            swap(this, i, i + 3)
            swap(this, i + 1, i + 2)
          }
          return this
        }

        Buffer.prototype.swap64 = function swap64() {
          var len = this.length
          if (len % 8 !== 0) {
            throw new RangeError('Buffer size must be a multiple of 64-bits')
          }
          for (var i = 0; i < len; i += 8) {
            swap(this, i, i + 7)
            swap(this, i + 1, i + 6)
            swap(this, i + 2, i + 5)
            swap(this, i + 3, i + 4)
          }
          return this
        }

        Buffer.prototype.toString = function toString() {
          var length = this.length
          if (length === 0) return ''
          if (arguments.length === 0) return utf8Slice(this, 0, length)
          return slowToString.apply(this, arguments)
        }

        Buffer.prototype.toLocaleString = Buffer.prototype.toString

        Buffer.prototype.equals = function equals(b) {
          if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
          if (this === b) return true
          return Buffer.compare(this, b) === 0
        }

        Buffer.prototype.inspect = function inspect() {
          var str = ''
          var max = exports.INSPECT_MAX_BYTES
          str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
          if (this.length > max) str += ' ... '
          return '<Buffer ' + str + '>'
        }
        if (customInspectSymbol) {
          Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
        }

        Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
          if (isInstance(target, Uint8Array)) {
            target = Buffer.from(target, target.offset, target.byteLength)
          }
          if (!Buffer.isBuffer(target)) {
            throw new TypeError(
              'The "target" argument must be one of type Buffer or Uint8Array. ' +
              'Received type ' + (typeof target)
            )
          }

          if (start === undefined) {
            start = 0
          }
          if (end === undefined) {
            end = target ? target.length : 0
          }
          if (thisStart === undefined) {
            thisStart = 0
          }
          if (thisEnd === undefined) {
            thisEnd = this.length
          }

          if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
            throw new RangeError('out of range index')
          }

          if (thisStart >= thisEnd && start >= end) {
            return 0
          }
          if (thisStart >= thisEnd) {
            return -1
          }
          if (start >= end) {
            return 1
          }

          start >>>= 0
          end >>>= 0
          thisStart >>>= 0
          thisEnd >>>= 0

          if (this === target) return 0

          var x = thisEnd - thisStart
          var y = end - start
          var len = Math.min(x, y)

          var thisCopy = this.slice(thisStart, thisEnd)
          var targetCopy = target.slice(start, end)

          for (var i = 0; i < len; ++i) {
            if (thisCopy[i] !== targetCopy[i]) {
              x = thisCopy[i]
              y = targetCopy[i]
              break
            }
          }

          if (x < y) return -1
          if (y < x) return 1
          return 0
        }

        // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
        // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
        //
        // Arguments:
        // - buffer - a Buffer to search
        // - val - a string, Buffer, or number
        // - byteOffset - an index into `buffer`; will be clamped to an int32
        // - encoding - an optional encoding, relevant is val is a string
        // - dir - true for indexOf, false for lastIndexOf
        function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
          // Empty buffer means no match
          if (buffer.length === 0) return -1

          // Normalize byteOffset
          if (typeof byteOffset === 'string') {
            encoding = byteOffset
            byteOffset = 0
          } else if (byteOffset > 0x7fffffff) {
            byteOffset = 0x7fffffff
          } else if (byteOffset < -0x80000000) {
            byteOffset = -0x80000000
          }
          byteOffset = +byteOffset // Coerce to Number.
          if (numberIsNaN(byteOffset)) {
            // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
            byteOffset = dir ? 0 : (buffer.length - 1)
          }

          // Normalize byteOffset: negative offsets start from the end of the buffer
          if (byteOffset < 0) byteOffset = buffer.length + byteOffset
          if (byteOffset >= buffer.length) {
            if (dir) return -1
            else byteOffset = buffer.length - 1
          } else if (byteOffset < 0) {
            if (dir) byteOffset = 0
            else return -1
          }

          // Normalize val
          if (typeof val === 'string') {
            val = Buffer.from(val, encoding)
          }

          // Finally, search either indexOf (if dir is true) or lastIndexOf
          if (Buffer.isBuffer(val)) {
            // Special case: looking for empty string/buffer always fails
            if (val.length === 0) {
              return -1
            }
            return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
          } else if (typeof val === 'number') {
            val = val & 0xFF // Search for a byte value [0-255]
            if (typeof Uint8Array.prototype.indexOf === 'function') {
              if (dir) {
                return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
              } else {
                return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
              }
            }
            return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
          }

          throw new TypeError('val must be string, number or Buffer')
        }

        function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
          var indexSize = 1
          var arrLength = arr.length
          var valLength = val.length

          if (encoding !== undefined) {
            encoding = String(encoding).toLowerCase()
            if (encoding === 'ucs2' || encoding === 'ucs-2' ||
              encoding === 'utf16le' || encoding === 'utf-16le') {
              if (arr.length < 2 || val.length < 2) {
                return -1
              }
              indexSize = 2
              arrLength /= 2
              valLength /= 2
              byteOffset /= 2
            }
          }

          function read(buf, i) {
            if (indexSize === 1) {
              return buf[i]
            } else {
              return buf.readUInt16BE(i * indexSize)
            }
          }

          var i
          if (dir) {
            var foundIndex = -1
            for (i = byteOffset; i < arrLength; i++) {
              if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
                if (foundIndex === -1) foundIndex = i
                if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
              } else {
                if (foundIndex !== -1) i -= i - foundIndex
                foundIndex = -1
              }
            }
          } else {
            if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
            for (i = byteOffset; i >= 0; i--) {
              var found = true
              for (var j = 0; j < valLength; j++) {
                if (read(arr, i + j) !== read(val, j)) {
                  found = false
                  break
                }
              }
              if (found) return i
            }
          }

          return -1
        }

        Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
          return this.indexOf(val, byteOffset, encoding) !== -1
        }

        Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
          return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
        }

        Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
          return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
        }

        function hexWrite(buf, string, offset, length) {
          offset = Number(offset) || 0
          var remaining = buf.length - offset
          if (!length) {
            length = remaining
          } else {
            length = Number(length)
            if (length > remaining) {
              length = remaining
            }
          }

          var strLen = string.length

          if (length > strLen / 2) {
            length = strLen / 2
          }
          for (var i = 0; i < length; ++i) {
            var parsed = parseInt(string.substr(i * 2, 2), 16)
            if (numberIsNaN(parsed)) return i
            buf[offset + i] = parsed
          }
          return i
        }

        function utf8Write(buf, string, offset, length) {
          return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
        }

        function asciiWrite(buf, string, offset, length) {
          return blitBuffer(asciiToBytes(string), buf, offset, length)
        }

        function latin1Write(buf, string, offset, length) {
          return asciiWrite(buf, string, offset, length)
        }

        function base64Write(buf, string, offset, length) {
          return blitBuffer(base64ToBytes(string), buf, offset, length)
        }

        function ucs2Write(buf, string, offset, length) {
          return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
        }

        Buffer.prototype.write = function write(string, offset, length, encoding) {
          // Buffer#write(string)
          if (offset === undefined) {
            encoding = 'utf8'
            length = this.length
            offset = 0
            // Buffer#write(string, encoding)
          } else if (length === undefined && typeof offset === 'string') {
            encoding = offset
            length = this.length
            offset = 0
            // Buffer#write(string, offset[, length][, encoding])
          } else if (isFinite(offset)) {
            offset = offset >>> 0
            if (isFinite(length)) {
              length = length >>> 0
              if (encoding === undefined) encoding = 'utf8'
            } else {
              encoding = length
              length = undefined
            }
          } else {
            throw new Error(
              'Buffer.write(string, encoding, offset[, length]) is no longer supported'
            )
          }

          var remaining = this.length - offset
          if (length === undefined || length > remaining) length = remaining

          if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
            throw new RangeError('Attempt to write outside buffer bounds')
          }

          if (!encoding) encoding = 'utf8'

          var loweredCase = false
          for (; ;) {
            switch (encoding) {
              case 'hex':
                return hexWrite(this, string, offset, length)

              case 'utf8':
              case 'utf-8':
                return utf8Write(this, string, offset, length)

              case 'ascii':
                return asciiWrite(this, string, offset, length)

              case 'latin1':
              case 'binary':
                return latin1Write(this, string, offset, length)

              case 'base64':
                // Warning: maxLength not taken into account in base64Write
                return base64Write(this, string, offset, length)

              case 'ucs2':
              case 'ucs-2':
              case 'utf16le':
              case 'utf-16le':
                return ucs2Write(this, string, offset, length)

              default:
                if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
                encoding = ('' + encoding).toLowerCase()
                loweredCase = true
            }
          }
        }

        Buffer.prototype.toJSON = function toJSON() {
          return {
            type: 'Buffer',
            data: Array.prototype.slice.call(this._arr || this, 0)
          }
        }

        function base64Slice(buf, start, end) {
          if (start === 0 && end === buf.length) {
            return base64.fromByteArray(buf)
          } else {
            return base64.fromByteArray(buf.slice(start, end))
          }
        }

        function utf8Slice(buf, start, end) {
          end = Math.min(buf.length, end)
          var res = []

          var i = start
          while (i < end) {
            var firstByte = buf[i]
            var codePoint = null
            var bytesPerSequence = (firstByte > 0xEF)
              ? 4
              : (firstByte > 0xDF)
                ? 3
                : (firstByte > 0xBF)
                  ? 2
                  : 1

            if (i + bytesPerSequence <= end) {
              var secondByte, thirdByte, fourthByte, tempCodePoint

              switch (bytesPerSequence) {
                case 1:
                  if (firstByte < 0x80) {
                    codePoint = firstByte
                  }
                  break
                case 2:
                  secondByte = buf[i + 1]
                  if ((secondByte & 0xC0) === 0x80) {
                    tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
                    if (tempCodePoint > 0x7F) {
                      codePoint = tempCodePoint
                    }
                  }
                  break
                case 3:
                  secondByte = buf[i + 1]
                  thirdByte = buf[i + 2]
                  if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                    tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
                    if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                      codePoint = tempCodePoint
                    }
                  }
                  break
                case 4:
                  secondByte = buf[i + 1]
                  thirdByte = buf[i + 2]
                  fourthByte = buf[i + 3]
                  if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                    tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
                    if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                      codePoint = tempCodePoint
                    }
                  }
              }
            }

            if (codePoint === null) {
              // we did not generate a valid codePoint so insert a
              // replacement char (U+FFFD) and advance only 1 byte
              codePoint = 0xFFFD
              bytesPerSequence = 1
            } else if (codePoint > 0xFFFF) {
              // encode to utf16 (surrogate pair dance)
              codePoint -= 0x10000
              res.push(codePoint >>> 10 & 0x3FF | 0xD800)
              codePoint = 0xDC00 | codePoint & 0x3FF
            }

            res.push(codePoint)
            i += bytesPerSequence
          }

          return decodeCodePointsArray(res)
        }

        // Based on http://stackoverflow.com/a/22747272/680742, the browser with
        // the lowest limit is Chrome, with 0x10000 args.
        // We go 1 magnitude less, for safety
        var MAX_ARGUMENTS_LENGTH = 0x1000

        function decodeCodePointsArray(codePoints) {
          var len = codePoints.length
          if (len <= MAX_ARGUMENTS_LENGTH) {
            return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
          }

          // Decode in chunks to avoid "call stack size exceeded".
          var res = ''
          var i = 0
          while (i < len) {
            res += String.fromCharCode.apply(
              String,
              codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
            )
          }
          return res
        }

        function asciiSlice(buf, start, end) {
          var ret = ''
          end = Math.min(buf.length, end)

          for (var i = start; i < end; ++i) {
            ret += String.fromCharCode(buf[i] & 0x7F)
          }
          return ret
        }

        function latin1Slice(buf, start, end) {
          var ret = ''
          end = Math.min(buf.length, end)

          for (var i = start; i < end; ++i) {
            ret += String.fromCharCode(buf[i])
          }
          return ret
        }

        function hexSlice(buf, start, end) {
          var len = buf.length

          if (!start || start < 0) start = 0
          if (!end || end < 0 || end > len) end = len

          var out = ''
          for (var i = start; i < end; ++i) {
            out += hexSliceLookupTable[buf[i]]
          }
          return out
        }

        function utf16leSlice(buf, start, end) {
          var bytes = buf.slice(start, end)
          var res = ''
          for (var i = 0; i < bytes.length; i += 2) {
            res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
          }
          return res
        }

        Buffer.prototype.slice = function slice(start, end) {
          var len = this.length
          start = ~~start
          end = end === undefined ? len : ~~end

          if (start < 0) {
            start += len
            if (start < 0) start = 0
          } else if (start > len) {
            start = len
          }

          if (end < 0) {
            end += len
            if (end < 0) end = 0
          } else if (end > len) {
            end = len
          }

          if (end < start) end = start

          var newBuf = this.subarray(start, end)
          // Return an augmented `Uint8Array` instance
          Object.setPrototypeOf(newBuf, Buffer.prototype)

          return newBuf
        }

        /*
         * Need to make sure that buffer isn't trying to write out of bounds.
         */
        function checkOffset(offset, ext, length) {
          if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
          if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
        }

        Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
          offset = offset >>> 0
          byteLength = byteLength >>> 0
          if (!noAssert) checkOffset(offset, byteLength, this.length)

          var val = this[offset]
          var mul = 1
          var i = 0
          while (++i < byteLength && (mul *= 0x100)) {
            val += this[offset + i] * mul
          }

          return val
        }

        Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
          offset = offset >>> 0
          byteLength = byteLength >>> 0
          if (!noAssert) {
            checkOffset(offset, byteLength, this.length)
          }

          var val = this[offset + --byteLength]
          var mul = 1
          while (byteLength > 0 && (mul *= 0x100)) {
            val += this[offset + --byteLength] * mul
          }

          return val
        }

        Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 1, this.length)
          return this[offset]
        }

        Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 2, this.length)
          return this[offset] | (this[offset + 1] << 8)
        }

        Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 2, this.length)
          return (this[offset] << 8) | this[offset + 1]
        }

        Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 4, this.length)

          return ((this[offset]) |
            (this[offset + 1] << 8) |
            (this[offset + 2] << 16)) +
            (this[offset + 3] * 0x1000000)
        }

        Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 4, this.length)

          return (this[offset] * 0x1000000) +
            ((this[offset + 1] << 16) |
              (this[offset + 2] << 8) |
              this[offset + 3])
        }

        Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
          offset = offset >>> 0
          byteLength = byteLength >>> 0
          if (!noAssert) checkOffset(offset, byteLength, this.length)

          var val = this[offset]
          var mul = 1
          var i = 0
          while (++i < byteLength && (mul *= 0x100)) {
            val += this[offset + i] * mul
          }
          mul *= 0x80

          if (val >= mul) val -= Math.pow(2, 8 * byteLength)

          return val
        }

        Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
          offset = offset >>> 0
          byteLength = byteLength >>> 0
          if (!noAssert) checkOffset(offset, byteLength, this.length)

          var i = byteLength
          var mul = 1
          var val = this[offset + --i]
          while (i > 0 && (mul *= 0x100)) {
            val += this[offset + --i] * mul
          }
          mul *= 0x80

          if (val >= mul) val -= Math.pow(2, 8 * byteLength)

          return val
        }

        Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 1, this.length)
          if (!(this[offset] & 0x80)) return (this[offset])
          return ((0xff - this[offset] + 1) * -1)
        }

        Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 2, this.length)
          var val = this[offset] | (this[offset + 1] << 8)
          return (val & 0x8000) ? val | 0xFFFF0000 : val
        }

        Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 2, this.length)
          var val = this[offset + 1] | (this[offset] << 8)
          return (val & 0x8000) ? val | 0xFFFF0000 : val
        }

        Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 4, this.length)

          return (this[offset]) |
            (this[offset + 1] << 8) |
            (this[offset + 2] << 16) |
            (this[offset + 3] << 24)
        }

        Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 4, this.length)

          return (this[offset] << 24) |
            (this[offset + 1] << 16) |
            (this[offset + 2] << 8) |
            (this[offset + 3])
        }

        Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 4, this.length)
          return ieee754.read(this, offset, true, 23, 4)
        }

        Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 4, this.length)
          return ieee754.read(this, offset, false, 23, 4)
        }

        Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 8, this.length)
          return ieee754.read(this, offset, true, 52, 8)
        }

        Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
          offset = offset >>> 0
          if (!noAssert) checkOffset(offset, 8, this.length)
          return ieee754.read(this, offset, false, 52, 8)
        }

        function checkInt(buf, value, offset, ext, max, min) {
          if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
          if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
          if (offset + ext > buf.length) throw new RangeError('Index out of range')
        }

        Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
          value = +value
          offset = offset >>> 0
          byteLength = byteLength >>> 0
          if (!noAssert) {
            var maxBytes = Math.pow(2, 8 * byteLength) - 1
            checkInt(this, value, offset, byteLength, maxBytes, 0)
          }

          var mul = 1
          var i = 0
          this[offset] = value & 0xFF
          while (++i < byteLength && (mul *= 0x100)) {
            this[offset + i] = (value / mul) & 0xFF
          }

          return offset + byteLength
        }

        Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
          value = +value
          offset = offset >>> 0
          byteLength = byteLength >>> 0
          if (!noAssert) {
            var maxBytes = Math.pow(2, 8 * byteLength) - 1
            checkInt(this, value, offset, byteLength, maxBytes, 0)
          }

          var i = byteLength - 1
          var mul = 1
          this[offset + i] = value & 0xFF
          while (--i >= 0 && (mul *= 0x100)) {
            this[offset + i] = (value / mul) & 0xFF
          }

          return offset + byteLength
        }

        Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
          this[offset] = (value & 0xff)
          return offset + 1
        }

        Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
          this[offset] = (value & 0xff)
          this[offset + 1] = (value >>> 8)
          return offset + 2
        }

        Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
          this[offset] = (value >>> 8)
          this[offset + 1] = (value & 0xff)
          return offset + 2
        }

        Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
          this[offset + 3] = (value >>> 24)
          this[offset + 2] = (value >>> 16)
          this[offset + 1] = (value >>> 8)
          this[offset] = (value & 0xff)
          return offset + 4
        }

        Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
          this[offset] = (value >>> 24)
          this[offset + 1] = (value >>> 16)
          this[offset + 2] = (value >>> 8)
          this[offset + 3] = (value & 0xff)
          return offset + 4
        }

        Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) {
            var limit = Math.pow(2, (8 * byteLength) - 1)

            checkInt(this, value, offset, byteLength, limit - 1, -limit)
          }

          var i = 0
          var mul = 1
          var sub = 0
          this[offset] = value & 0xFF
          while (++i < byteLength && (mul *= 0x100)) {
            if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
              sub = 1
            }
            this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
          }

          return offset + byteLength
        }

        Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) {
            var limit = Math.pow(2, (8 * byteLength) - 1)

            checkInt(this, value, offset, byteLength, limit - 1, -limit)
          }

          var i = byteLength - 1
          var mul = 1
          var sub = 0
          this[offset + i] = value & 0xFF
          while (--i >= 0 && (mul *= 0x100)) {
            if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
              sub = 1
            }
            this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
          }

          return offset + byteLength
        }

        Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
          if (value < 0) value = 0xff + value + 1
          this[offset] = (value & 0xff)
          return offset + 1
        }

        Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
          this[offset] = (value & 0xff)
          this[offset + 1] = (value >>> 8)
          return offset + 2
        }

        Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
          this[offset] = (value >>> 8)
          this[offset + 1] = (value & 0xff)
          return offset + 2
        }

        Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
          this[offset] = (value & 0xff)
          this[offset + 1] = (value >>> 8)
          this[offset + 2] = (value >>> 16)
          this[offset + 3] = (value >>> 24)
          return offset + 4
        }

        Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
          if (value < 0) value = 0xffffffff + value + 1
          this[offset] = (value >>> 24)
          this[offset + 1] = (value >>> 16)
          this[offset + 2] = (value >>> 8)
          this[offset + 3] = (value & 0xff)
          return offset + 4
        }

        function checkIEEE754(buf, value, offset, ext, max, min) {
          if (offset + ext > buf.length) throw new RangeError('Index out of range')
          if (offset < 0) throw new RangeError('Index out of range')
        }

        function writeFloat(buf, value, offset, littleEndian, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) {
            checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
          }
          ieee754.write(buf, value, offset, littleEndian, 23, 4)
          return offset + 4
        }

        Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
          return writeFloat(this, value, offset, true, noAssert)
        }

        Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
          return writeFloat(this, value, offset, false, noAssert)
        }

        function writeDouble(buf, value, offset, littleEndian, noAssert) {
          value = +value
          offset = offset >>> 0
          if (!noAssert) {
            checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
          }
          ieee754.write(buf, value, offset, littleEndian, 52, 8)
          return offset + 8
        }

        Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
          return writeDouble(this, value, offset, true, noAssert)
        }

        Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
          return writeDouble(this, value, offset, false, noAssert)
        }

        // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
        Buffer.prototype.copy = function copy(target, targetStart, start, end) {
          if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
          if (!start) start = 0
          if (!end && end !== 0) end = this.length
          if (targetStart >= target.length) targetStart = target.length
          if (!targetStart) targetStart = 0
          if (end > 0 && end < start) end = start

          // Copy 0 bytes; we're done
          if (end === start) return 0
          if (target.length === 0 || this.length === 0) return 0

          // Fatal error conditions
          if (targetStart < 0) {
            throw new RangeError('targetStart out of bounds')
          }
          if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
          if (end < 0) throw new RangeError('sourceEnd out of bounds')

          // Are we oob?
          if (end > this.length) end = this.length
          if (target.length - targetStart < end - start) {
            end = target.length - targetStart + start
          }

          var len = end - start

          if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
            // Use built-in when available, missing from IE11
            this.copyWithin(targetStart, start, end)
          } else if (this === target && start < targetStart && targetStart < end) {
            // descending copy from end
            for (var i = len - 1; i >= 0; --i) {
              target[i + targetStart] = this[i + start]
            }
          } else {
            Uint8Array.prototype.set.call(
              target,
              this.subarray(start, end),
              targetStart
            )
          }

          return len
        }

        // Usage:
        //    buffer.fill(number[, offset[, end]])
        //    buffer.fill(buffer[, offset[, end]])
        //    buffer.fill(string[, offset[, end]][, encoding])
        Buffer.prototype.fill = function fill(val, start, end, encoding) {
          // Handle string cases:
          if (typeof val === 'string') {
            if (typeof start === 'string') {
              encoding = start
              start = 0
              end = this.length
            } else if (typeof end === 'string') {
              encoding = end
              end = this.length
            }
            if (encoding !== undefined && typeof encoding !== 'string') {
              throw new TypeError('encoding must be a string')
            }
            if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
              throw new TypeError('Unknown encoding: ' + encoding)
            }
            if (val.length === 1) {
              var code = val.charCodeAt(0)
              if ((encoding === 'utf8' && code < 128) ||
                encoding === 'latin1') {
                // Fast path: If `val` fits into a single byte, use that numeric value.
                val = code
              }
            }
          } else if (typeof val === 'number') {
            val = val & 255
          } else if (typeof val === 'boolean') {
            val = Number(val)
          }

          // Invalid ranges are not set to a default, so can range check early.
          if (start < 0 || this.length < start || this.length < end) {
            throw new RangeError('Out of range index')
          }

          if (end <= start) {
            return this
          }

          start = start >>> 0
          end = end === undefined ? this.length : end >>> 0

          if (!val) val = 0

          var i
          if (typeof val === 'number') {
            for (i = start; i < end; ++i) {
              this[i] = val
            }
          } else {
            var bytes = Buffer.isBuffer(val)
              ? val
              : Buffer.from(val, encoding)
            var len = bytes.length
            if (len === 0) {
              throw new TypeError('The value "' + val +
                '" is invalid for argument "value"')
            }
            for (i = 0; i < end - start; ++i) {
              this[i + start] = bytes[i % len]
            }
          }

          return this
        }

        // HELPER FUNCTIONS
        // ================

        var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

        function base64clean(str) {
          // Node takes equal signs as end of the Base64 encoding
          str = str.split('=')[0]
          // Node strips out invalid characters like \n and \t from the string, base64-js does not
          str = str.trim().replace(INVALID_BASE64_RE, '')
          // Node converts strings with length < 2 to ''
          if (str.length < 2) return ''
          // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
          while (str.length % 4 !== 0) {
            str = str + '='
          }
          return str
        }

        function utf8ToBytes(string, units) {
          units = units || Infinity
          var codePoint
          var length = string.length
          var leadSurrogate = null
          var bytes = []

          for (var i = 0; i < length; ++i) {
            codePoint = string.charCodeAt(i)

            // is surrogate component
            if (codePoint > 0xD7FF && codePoint < 0xE000) {
              // last char was a lead
              if (!leadSurrogate) {
                // no lead yet
                if (codePoint > 0xDBFF) {
                  // unexpected trail
                  if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
                  continue
                } else if (i + 1 === length) {
                  // unpaired lead
                  if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
                  continue
                }

                // valid lead
                leadSurrogate = codePoint

                continue
              }

              // 2 leads in a row
              if (codePoint < 0xDC00) {
                if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
                leadSurrogate = codePoint
                continue
              }

              // valid surrogate pair
              codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
            } else if (leadSurrogate) {
              // valid bmp char, but last char was a lead
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
            }

            leadSurrogate = null

            // encode utf8
            if (codePoint < 0x80) {
              if ((units -= 1) < 0) break
              bytes.push(codePoint)
            } else if (codePoint < 0x800) {
              if ((units -= 2) < 0) break
              bytes.push(
                codePoint >> 0x6 | 0xC0,
                codePoint & 0x3F | 0x80
              )
            } else if (codePoint < 0x10000) {
              if ((units -= 3) < 0) break
              bytes.push(
                codePoint >> 0xC | 0xE0,
                codePoint >> 0x6 & 0x3F | 0x80,
                codePoint & 0x3F | 0x80
              )
            } else if (codePoint < 0x110000) {
              if ((units -= 4) < 0) break
              bytes.push(
                codePoint >> 0x12 | 0xF0,
                codePoint >> 0xC & 0x3F | 0x80,
                codePoint >> 0x6 & 0x3F | 0x80,
                codePoint & 0x3F | 0x80
              )
            } else {
              throw new Error('Invalid code point')
            }
          }

          return bytes
        }

        function asciiToBytes(str) {
          var byteArray = []
          for (var i = 0; i < str.length; ++i) {
            // Node's code seems to be doing this and not & 0x7F..
            byteArray.push(str.charCodeAt(i) & 0xFF)
          }
          return byteArray
        }

        function utf16leToBytes(str, units) {
          var c, hi, lo
          var byteArray = []
          for (var i = 0; i < str.length; ++i) {
            if ((units -= 2) < 0) break

            c = str.charCodeAt(i)
            hi = c >> 8
            lo = c % 256
            byteArray.push(lo)
            byteArray.push(hi)
          }

          return byteArray
        }

        function base64ToBytes(str) {
          return base64.toByteArray(base64clean(str))
        }

        function blitBuffer(src, dst, offset, length) {
          for (var i = 0; i < length; ++i) {
            if ((i + offset >= dst.length) || (i >= src.length)) break
            dst[i + offset] = src[i]
          }
          return i
        }

        // ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
        // the `instanceof` check but they should be treated as of that type.
        // See: https://github.com/feross/buffer/issues/166
        function isInstance(obj, type) {
          return obj instanceof type ||
            (obj != null && obj.constructor != null && obj.constructor.name != null &&
              obj.constructor.name === type.name)
        }
        function numberIsNaN(obj) {
          // For IE11 support
          return obj !== obj // eslint-disable-line no-self-compare
        }

        // Create lookup table for `toString('hex')`
        // See: https://github.com/feross/buffer/issues/219
        var hexSliceLookupTable = (function () {
          var alphabet = '0123456789abcdef'
          var table = new Array(256)
          for (var i = 0; i < 16; ++i) {
            var i16 = i * 16
            for (var j = 0; j < 16; ++j) {
              table[i16 + j] = alphabet[i] + alphabet[j]
            }
          }
          return table
        })()


        /***/
      }),

/***/ "./node_modules/events/events.js":
/*!***************************************!*\
  !*** ./node_modules/events/events.js ***!
  \***************************************/
/***/ ((module) => {

        "use strict";
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.



        var R = typeof Reflect === 'object' ? Reflect : null
        var ReflectApply = R && typeof R.apply === 'function'
          ? R.apply
          : function ReflectApply(target, receiver, args) {
            return Function.prototype.apply.call(target, receiver, args);
          }

        var ReflectOwnKeys
        if (R && typeof R.ownKeys === 'function') {
          ReflectOwnKeys = R.ownKeys
        } else if (Object.getOwnPropertySymbols) {
          ReflectOwnKeys = function ReflectOwnKeys(target) {
            return Object.getOwnPropertyNames(target)
              .concat(Object.getOwnPropertySymbols(target));
          };
        } else {
          ReflectOwnKeys = function ReflectOwnKeys(target) {
            return Object.getOwnPropertyNames(target);
          };
        }

        function ProcessEmitWarning(warning) {
          if (console && console.warn) console.warn(warning);
        }

        var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
          return value !== value;
        }

        function EventEmitter() {
          EventEmitter.init.call(this);
        }
        module.exports = EventEmitter;
        module.exports.once = once;

        // Backwards-compat with node 0.10.x
        EventEmitter.EventEmitter = EventEmitter;

        EventEmitter.prototype._events = undefined;
        EventEmitter.prototype._eventsCount = 0;
        EventEmitter.prototype._maxListeners = undefined;

        // By default EventEmitters will print a warning if more than 10 listeners are
        // added to it. This is a useful default which helps finding memory leaks.
        var defaultMaxListeners = 10;

        function checkListener(listener) {
          if (typeof listener !== 'function') {
            throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
          }
        }

        Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
          enumerable: true,
          get: function () {
            return defaultMaxListeners;
          },
          set: function (arg) {
            if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
              throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
            }
            defaultMaxListeners = arg;
          }
        });

        EventEmitter.init = function () {

          if (this._events === undefined ||
            this._events === Object.getPrototypeOf(this)._events) {
            this._events = Object.create(null);
            this._eventsCount = 0;
          }

          this._maxListeners = this._maxListeners || undefined;
        };

        // Obviously not all Emitters should be limited to 10. This function allows
        // that to be increased. Set to zero for unlimited.
        EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
          if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
            throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
          }
          this._maxListeners = n;
          return this;
        };

        function _getMaxListeners(that) {
          if (that._maxListeners === undefined)
            return EventEmitter.defaultMaxListeners;
          return that._maxListeners;
        }

        EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
          return _getMaxListeners(this);
        };

        EventEmitter.prototype.emit = function emit(type) {
          var args = [];
          for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
          var doError = (type === 'error');

          var events = this._events;
          if (events !== undefined)
            doError = (doError && events.error === undefined);
          else if (!doError)
            return false;

          // If there is no 'error' event listener then throw.
          if (doError) {
            var er;
            if (args.length > 0)
              er = args[0];
            if (er instanceof Error) {
              // Note: The comments on the `throw` lines are intentional, they show
              // up in Node's output if this results in an unhandled exception.
              throw er; // Unhandled 'error' event
            }
            // At least give some kind of context to the user
            var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
            err.context = er;
            throw err; // Unhandled 'error' event
          }

          var handler = events[type];

          if (handler === undefined)
            return false;

          if (typeof handler === 'function') {
            ReflectApply(handler, this, args);
          } else {
            var len = handler.length;
            var listeners = arrayClone(handler, len);
            for (var i = 0; i < len; ++i)
              ReflectApply(listeners[i], this, args);
          }

          return true;
        };

        function _addListener(target, type, listener, prepend) {
          var m;
          var events;
          var existing;

          checkListener(listener);

          events = target._events;
          if (events === undefined) {
            events = target._events = Object.create(null);
            target._eventsCount = 0;
          } else {
            // To avoid recursion in the case that type === "newListener"! Before
            // adding it to the listeners, first emit "newListener".
            if (events.newListener !== undefined) {
              target.emit('newListener', type,
                listener.listener ? listener.listener : listener);

              // Re-assign `events` because a newListener handler could have caused the
              // this._events to be assigned to a new object
              events = target._events;
            }
            existing = events[type];
          }

          if (existing === undefined) {
            // Optimize the case of one listener. Don't need the extra array object.
            existing = events[type] = listener;
            ++target._eventsCount;
          } else {
            if (typeof existing === 'function') {
              // Adding the second element, need to change to array.
              existing = events[type] =
                prepend ? [listener, existing] : [existing, listener];
              // If we've already got an array, just append.
            } else if (prepend) {
              existing.unshift(listener);
            } else {
              existing.push(listener);
            }

            // Check for listener leak
            m = _getMaxListeners(target);
            if (m > 0 && existing.length > m && !existing.warned) {
              existing.warned = true;
              // No error code for this since it is a Warning
              // eslint-disable-next-line no-restricted-syntax
              var w = new Error('Possible EventEmitter memory leak detected. ' +
                existing.length + ' ' + String(type) + ' listeners ' +
                'added. Use emitter.setMaxListeners() to ' +
                'increase limit');
              w.name = 'MaxListenersExceededWarning';
              w.emitter = target;
              w.type = type;
              w.count = existing.length;
              ProcessEmitWarning(w);
            }
          }

          return target;
        }

        EventEmitter.prototype.addListener = function addListener(type, listener) {
          return _addListener(this, type, listener, false);
        };

        EventEmitter.prototype.on = EventEmitter.prototype.addListener;

        EventEmitter.prototype.prependListener =
          function prependListener(type, listener) {
            return _addListener(this, type, listener, true);
          };

        function onceWrapper() {
          if (!this.fired) {
            this.target.removeListener(this.type, this.wrapFn);
            this.fired = true;
            if (arguments.length === 0)
              return this.listener.call(this.target);
            return this.listener.apply(this.target, arguments);
          }
        }

        function _onceWrap(target, type, listener) {
          var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
          var wrapped = onceWrapper.bind(state);
          wrapped.listener = listener;
          state.wrapFn = wrapped;
          return wrapped;
        }

        EventEmitter.prototype.once = function once(type, listener) {
          checkListener(listener);
          this.on(type, _onceWrap(this, type, listener));
          return this;
        };

        EventEmitter.prototype.prependOnceListener =
          function prependOnceListener(type, listener) {
            checkListener(listener);
            this.prependListener(type, _onceWrap(this, type, listener));
            return this;
          };

        // Emits a 'removeListener' event if and only if the listener was removed.
        EventEmitter.prototype.removeListener =
          function removeListener(type, listener) {
            var list, events, position, i, originalListener;

            checkListener(listener);

            events = this._events;
            if (events === undefined)
              return this;

            list = events[type];
            if (list === undefined)
              return this;

            if (list === listener || list.listener === listener) {
              if (--this._eventsCount === 0)
                this._events = Object.create(null);
              else {
                delete events[type];
                if (events.removeListener)
                  this.emit('removeListener', type, list.listener || listener);
              }
            } else if (typeof list !== 'function') {
              position = -1;

              for (i = list.length - 1; i >= 0; i--) {
                if (list[i] === listener || list[i].listener === listener) {
                  originalListener = list[i].listener;
                  position = i;
                  break;
                }
              }

              if (position < 0)
                return this;

              if (position === 0)
                list.shift();
              else {
                spliceOne(list, position);
              }

              if (list.length === 1)
                events[type] = list[0];

              if (events.removeListener !== undefined)
                this.emit('removeListener', type, originalListener || listener);
            }

            return this;
          };

        EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

        EventEmitter.prototype.removeAllListeners =
          function removeAllListeners(type) {
            var listeners, events, i;

            events = this._events;
            if (events === undefined)
              return this;

            // not listening for removeListener, no need to emit
            if (events.removeListener === undefined) {
              if (arguments.length === 0) {
                this._events = Object.create(null);
                this._eventsCount = 0;
              } else if (events[type] !== undefined) {
                if (--this._eventsCount === 0)
                  this._events = Object.create(null);
                else
                  delete events[type];
              }
              return this;
            }

            // emit removeListener for all listeners on all events
            if (arguments.length === 0) {
              var keys = Object.keys(events);
              var key;
              for (i = 0; i < keys.length; ++i) {
                key = keys[i];
                if (key === 'removeListener') continue;
                this.removeAllListeners(key);
              }
              this.removeAllListeners('removeListener');
              this._events = Object.create(null);
              this._eventsCount = 0;
              return this;
            }

            listeners = events[type];

            if (typeof listeners === 'function') {
              this.removeListener(type, listeners);
            } else if (listeners !== undefined) {
              // LIFO order
              for (i = listeners.length - 1; i >= 0; i--) {
                this.removeListener(type, listeners[i]);
              }
            }

            return this;
          };

        function _listeners(target, type, unwrap) {
          var events = target._events;

          if (events === undefined)
            return [];

          var evlistener = events[type];
          if (evlistener === undefined)
            return [];

          if (typeof evlistener === 'function')
            return unwrap ? [evlistener.listener || evlistener] : [evlistener];

          return unwrap ?
            unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
        }

        EventEmitter.prototype.listeners = function listeners(type) {
          return _listeners(this, type, true);
        };

        EventEmitter.prototype.rawListeners = function rawListeners(type) {
          return _listeners(this, type, false);
        };

        EventEmitter.listenerCount = function (emitter, type) {
          if (typeof emitter.listenerCount === 'function') {
            return emitter.listenerCount(type);
          } else {
            return listenerCount.call(emitter, type);
          }
        };

        EventEmitter.prototype.listenerCount = listenerCount;
        function listenerCount(type) {
          var events = this._events;

          if (events !== undefined) {
            var evlistener = events[type];

            if (typeof evlistener === 'function') {
              return 1;
            } else if (evlistener !== undefined) {
              return evlistener.length;
            }
          }

          return 0;
        }

        EventEmitter.prototype.eventNames = function eventNames() {
          return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
        };

        function arrayClone(arr, n) {
          var copy = new Array(n);
          for (var i = 0; i < n; ++i)
            copy[i] = arr[i];
          return copy;
        }

        function spliceOne(list, index) {
          for (; index + 1 < list.length; index++)
            list[index] = list[index + 1];
          list.pop();
        }

        function unwrapListeners(arr) {
          var ret = new Array(arr.length);
          for (var i = 0; i < ret.length; ++i) {
            ret[i] = arr[i].listener || arr[i];
          }
          return ret;
        }

        function once(emitter, name) {
          return new Promise(function (resolve, reject) {
            function eventListener() {
              if (errorListener !== undefined) {
                emitter.removeListener('error', errorListener);
              }
              resolve([].slice.call(arguments));
            };
            var errorListener;

            // Adding an error listener is not optional because
            // if an error is thrown on an event emitter we cannot
            // guarantee that the actual event we are waiting will
            // be fired. The result could be a silent way to create
            // memory or file descriptor leaks, which is something
            // we should avoid.
            if (name !== 'error') {
              errorListener = function errorListener(err) {
                emitter.removeListener(name, eventListener);
                reject(err);
              };

              emitter.once('error', errorListener);
            }

            emitter.once(name, eventListener);
          });
        }


        /***/
      }),

/***/ "./node_modules/ieee754/index.js":
/*!***************************************!*\
  !*** ./node_modules/ieee754/index.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports) => {

        exports.read = function (buffer, offset, isLE, mLen, nBytes) {
          var e, m
          var eLen = (nBytes * 8) - mLen - 1
          var eMax = (1 << eLen) - 1
          var eBias = eMax >> 1
          var nBits = -7
          var i = isLE ? (nBytes - 1) : 0
          var d = isLE ? -1 : 1
          var s = buffer[offset + i]

          i += d

          e = s & ((1 << (-nBits)) - 1)
          s >>= (-nBits)
          nBits += eLen
          for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) { }

          m = e & ((1 << (-nBits)) - 1)
          e >>= (-nBits)
          nBits += mLen
          for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) { }

          if (e === 0) {
            e = 1 - eBias
          } else if (e === eMax) {
            return m ? NaN : ((s ? -1 : 1) * Infinity)
          } else {
            m = m + Math.pow(2, mLen)
            e = e - eBias
          }
          return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
        }

        exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
          var e, m, c
          var eLen = (nBytes * 8) - mLen - 1
          var eMax = (1 << eLen) - 1
          var eBias = eMax >> 1
          var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
          var i = isLE ? 0 : (nBytes - 1)
          var d = isLE ? 1 : -1
          var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

          value = Math.abs(value)

          if (isNaN(value) || value === Infinity) {
            m = isNaN(value) ? 1 : 0
            e = eMax
          } else {
            e = Math.floor(Math.log(value) / Math.LN2)
            if (value * (c = Math.pow(2, -e)) < 1) {
              e--
              c *= 2
            }
            if (e + eBias >= 1) {
              value += rt / c
            } else {
              value += rt * Math.pow(2, 1 - eBias)
            }
            if (value * c >= 2) {
              e++
              c /= 2
            }

            if (e + eBias >= eMax) {
              m = 0
              e = eMax
            } else if (e + eBias >= 1) {
              m = ((value * c) - 1) * Math.pow(2, mLen)
              e = e + eBias
            } else {
              m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
              e = 0
            }
          }

          for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) { }

          e = (e << mLen) | m
          eLen += mLen
          for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) { }

          buffer[offset + i - d] |= s * 128
        }


        /***/
      }),

/***/ "./node_modules/inherits/inherits_browser.js":
/*!***************************************************!*\
  !*** ./node_modules/inherits/inherits_browser.js ***!
  \***************************************************/
/***/ ((module) => {

        if (typeof Object.create === 'function') {
          // implementation from standard node.js 'util' module
          module.exports = function inherits(ctor, superCtor) {
            if (superCtor) {
              ctor.super_ = superCtor
              ctor.prototype = Object.create(superCtor.prototype, {
                constructor: {
                  value: ctor,
                  enumerable: false,
                  writable: true,
                  configurable: true
                }
              })
            }
          };
        } else {
          // old school shim for old browsers
          module.exports = function inherits(ctor, superCtor) {
            if (superCtor) {
              ctor.super_ = superCtor
              var TempCtor = function () { }
              TempCtor.prototype = superCtor.prototype
              ctor.prototype = new TempCtor()
              ctor.prototype.constructor = ctor
            }
          }
        }


        /***/
      }),

/***/ "./node_modules/intel-hex/index.js":
/*!*****************************************!*\
  !*** ./node_modules/intel-hex/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(/*! buffer */ "./node_modules/buffer/index.js")["Buffer"];
        //Intel Hex record types
        const DATA = 0,
          END_OF_FILE = 1,
          EXT_SEGMENT_ADDR = 2,
          START_SEGMENT_ADDR = 3,
          EXT_LINEAR_ADDR = 4,
          START_LINEAR_ADDR = 5;

        const EMPTY_VALUE = 0xFF;

        /* intel_hex.parse(data)
          `data` - Intel Hex file (string in ASCII format or Buffer Object)
          `bufferSize` - the size of the Buffer containing the data (optional)
        	
          returns an Object with the following properties:
            - data - data as a Buffer Object, padded with 0xFF
              where data is empty.
            - startSegmentAddress - the address provided by the last
              start segment address record; null, if not given
            - startLinearAddress - the address provided by the last
              start linear address record; null, if not given
          Special thanks to: http://en.wikipedia.org/wiki/Intel_HEX
        */
        exports.parse = function parseIntelHex(data, bufferSize) {
          if (data instanceof Buffer)
            data = data.toString("ascii");
          //Initialization
          var buf = Buffer.alloc(bufferSize || 8192),
            bufLength = 0, //Length of data in the buffer
            highAddress = 0, //upper address
            startSegmentAddress = null,
            startLinearAddress = null,
            lineNum = 0, //Line number in the Intel Hex string
            pos = 0; //Current position in the Intel Hex string
          const SMALLEST_LINE = 11;
          while (pos + SMALLEST_LINE <= data.length) {
            //Parse an entire line
            if (data.charAt(pos++) != ":")
              throw new Error("Line " + (lineNum + 1) +
                " does not start with a colon (:).");
            else
              lineNum++;
            //Number of bytes (hex digit pairs) in the data field
            var dataLength = parseInt(data.substr(pos, 2), 16);
            pos += 2;
            //Get 16-bit address (big-endian)
            var lowAddress = parseInt(data.substr(pos, 4), 16);
            pos += 4;
            //Record type
            var recordType = parseInt(data.substr(pos, 2), 16);
            pos += 2;
            //Data field (hex-encoded string)
            var dataField = data.substr(pos, dataLength * 2),
              dataFieldBuf = Buffer.from(dataField, "hex");
            pos += dataLength * 2;
            //Checksum
            var checksum = parseInt(data.substr(pos, 2), 16);
            pos += 2;
            //Validate checksum
            var calcChecksum = (dataLength + (lowAddress >> 8) +
              lowAddress + recordType) & 0xFF;
            for (var i = 0; i < dataLength; i++)
              calcChecksum = (calcChecksum + dataFieldBuf[i]) & 0xFF;
            calcChecksum = (0x100 - calcChecksum) & 0xFF;
            if (checksum != calcChecksum)
              throw new Error("Invalid checksum on line " + lineNum +
                ": got " + checksum + ", but expected " + calcChecksum);
            //Parse the record based on its recordType
            switch (recordType) {
              case DATA:
                var absoluteAddress = highAddress + lowAddress;
                //Expand buf, if necessary
                if (absoluteAddress + dataLength >= buf.length) {
                  var tmp = Buffer.alloc((absoluteAddress + dataLength) * 2);
                  buf.copy(tmp, 0, 0, bufLength);
                  buf = tmp;
                }
                //Write over skipped bytes with EMPTY_VALUE
                if (absoluteAddress > bufLength)
                  buf.fill(EMPTY_VALUE, bufLength, absoluteAddress);
                //Write the dataFieldBuf to buf
                dataFieldBuf.copy(buf, absoluteAddress);
                bufLength = Math.max(bufLength, absoluteAddress + dataLength);
                break;
              case END_OF_FILE:
                if (dataLength != 0)
                  throw new Error("Invalid EOF record on line " +
                    lineNum + ".");
                return {
                  "data": buf.slice(0, bufLength),
                  "startSegmentAddress": startSegmentAddress,
                  "startLinearAddress": startLinearAddress
                };
                break;
              case EXT_SEGMENT_ADDR:
                if (dataLength != 2 || lowAddress != 0)
                  throw new Error("Invalid extended segment address record on line " +
                    lineNum + ".");
                highAddress = parseInt(dataField, 16) << 4;
                break;
              case START_SEGMENT_ADDR:
                if (dataLength != 4 || lowAddress != 0)
                  throw new Error("Invalid start segment address record on line " +
                    lineNum + ".");
                startSegmentAddress = parseInt(dataField, 16);
                break;
              case EXT_LINEAR_ADDR:
                if (dataLength != 2 || lowAddress != 0)
                  throw new Error("Invalid extended linear address record on line " +
                    lineNum + ".");
                highAddress = parseInt(dataField, 16) << 16;
                break;
              case START_LINEAR_ADDR:
                if (dataLength != 4 || lowAddress != 0)
                  throw new Error("Invalid start linear address record on line " +
                    lineNum + ".");
                startLinearAddress = parseInt(dataField, 16);
                break;
              default:
                throw new Error("Invalid record type (" + recordType +
                  ") on line " + lineNum);
                break;
            }
            //Advance to the next line
            if (data.charAt(pos) == "\r")
              pos++;
            if (data.charAt(pos) == "\n")
              pos++;
          }
          throw new Error("Unexpected end of input: missing or invalid EOF record.");
        };


        /***/
      }),

/***/ "./node_modules/process/browser.js":
/*!*****************************************!*\
  !*** ./node_modules/process/browser.js ***!
  \*****************************************/
/***/ ((module) => {

        // shim for using process in browser
        var process = module.exports = {};

        // cached from whatever global is present so that test runners that stub it
        // don't break things.  But we need to wrap it in a try catch in case it is
        // wrapped in strict mode code which doesn't define any globals.  It's inside a
        // function because try/catches deoptimize in certain engines.

        var cachedSetTimeout;
        var cachedClearTimeout;

        function defaultSetTimout() {
          throw new Error('setTimeout has not been defined');
        }
        function defaultClearTimeout() {
          throw new Error('clearTimeout has not been defined');
        }
        (function () {
          try {
            if (typeof setTimeout === 'function') {
              cachedSetTimeout = setTimeout;
            } else {
              cachedSetTimeout = defaultSetTimout;
            }
          } catch (e) {
            cachedSetTimeout = defaultSetTimout;
          }
          try {
            if (typeof clearTimeout === 'function') {
              cachedClearTimeout = clearTimeout;
            } else {
              cachedClearTimeout = defaultClearTimeout;
            }
          } catch (e) {
            cachedClearTimeout = defaultClearTimeout;
          }
        }())
        function runTimeout(fun) {
          if (cachedSetTimeout === setTimeout) {
            //normal enviroments in sane situations
            return setTimeout(fun, 0);
          }
          // if setTimeout wasn't available but was latter defined
          if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
          }
          try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
          } catch (e) {
            try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
              return cachedSetTimeout.call(null, fun, 0);
            } catch (e) {
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
              return cachedSetTimeout.call(this, fun, 0);
            }
          }


        }
        function runClearTimeout(marker) {
          if (cachedClearTimeout === clearTimeout) {
            //normal enviroments in sane situations
            return clearTimeout(marker);
          }
          // if clearTimeout wasn't available but was latter defined
          if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
          }
          try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
          } catch (e) {
            try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
              return cachedClearTimeout.call(null, marker);
            } catch (e) {
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
              // Some versions of I.E. have different rules for clearTimeout vs setTimeout
              return cachedClearTimeout.call(this, marker);
            }
          }



        }
        var queue = [];
        var draining = false;
        var currentQueue;
        var queueIndex = -1;

        function cleanUpNextTick() {
          if (!draining || !currentQueue) {
            return;
          }
          draining = false;
          if (currentQueue.length) {
            queue = currentQueue.concat(queue);
          } else {
            queueIndex = -1;
          }
          if (queue.length) {
            drainQueue();
          }
        }

        function drainQueue() {
          if (draining) {
            return;
          }
          var timeout = runTimeout(cleanUpNextTick);
          draining = true;

          var len = queue.length;
          while (len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
              if (currentQueue) {
                currentQueue[queueIndex].run();
              }
            }
            queueIndex = -1;
            len = queue.length;
          }
          currentQueue = null;
          draining = false;
          runClearTimeout(timeout);
        }

        process.nextTick = function (fun) {
          var args = new Array(arguments.length - 1);
          if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
            }
          }
          queue.push(new Item(fun, args));
          if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
          }
        };

        // v8 likes predictible objects
        function Item(fun, array) {
          this.fun = fun;
          this.array = array;
        }
        Item.prototype.run = function () {
          this.fun.apply(null, this.array);
        };
        process.title = 'browser';
        process.browser = true;
        process.env = {};
        process.argv = [];
        process.version = ''; // empty string to avoid regexp issues
        process.versions = {};

        function noop() { }

        process.on = noop;
        process.addListener = noop;
        process.once = noop;
        process.off = noop;
        process.removeListener = noop;
        process.removeAllListeners = noop;
        process.emit = noop;
        process.prependListener = noop;
        process.prependOnceListener = noop;

        process.listeners = function (name) { return [] }

        process.binding = function (name) {
          throw new Error('process.binding is not supported');
        };

        process.cwd = function () { return '/' };
        process.chdir = function (dir) {
          throw new Error('process.chdir is not supported');
        };
        process.umask = function () { return 0; };


        /***/
      }),

/***/ "./node_modules/readable-stream/errors-browser.js":
/*!********************************************************!*\
  !*** ./node_modules/readable-stream/errors-browser.js ***!
  \********************************************************/
/***/ ((module) => {

        "use strict";


        function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

        var codes = {};

        function createErrorType(code, message, Base) {
          if (!Base) {
            Base = Error;
          }

          function getMessage(arg1, arg2, arg3) {
            if (typeof message === 'string') {
              return message;
            } else {
              return message(arg1, arg2, arg3);
            }
          }

          var NodeError =
            /*#__PURE__*/
            function (_Base) {
              _inheritsLoose(NodeError, _Base);

              function NodeError(arg1, arg2, arg3) {
                return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
              }

              return NodeError;
            }(Base);

          NodeError.prototype.name = Base.name;
          NodeError.prototype.code = code;
          codes[code] = NodeError;
        } // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


        function oneOf(expected, thing) {
          if (Array.isArray(expected)) {
            var len = expected.length;
            expected = expected.map(function (i) {
              return String(i);
            });

            if (len > 2) {
              return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
            } else if (len === 2) {
              return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
            } else {
              return "of ".concat(thing, " ").concat(expected[0]);
            }
          } else {
            return "of ".concat(thing, " ").concat(String(expected));
          }
        } // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


        function startsWith(str, search, pos) {
          return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
        } // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


        function endsWith(str, search, this_len) {
          if (this_len === undefined || this_len > str.length) {
            this_len = str.length;
          }

          return str.substring(this_len - search.length, this_len) === search;
        } // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


        function includes(str, search, start) {
          if (typeof start !== 'number') {
            start = 0;
          }

          if (start + search.length > str.length) {
            return false;
          } else {
            return str.indexOf(search, start) !== -1;
          }
        }

        createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
          return 'The value "' + value + '" is invalid for option "' + name + '"';
        }, TypeError);
        createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
          // determiner: 'must be' or 'must not be'
          var determiner;

          if (typeof expected === 'string' && startsWith(expected, 'not ')) {
            determiner = 'must not be';
            expected = expected.replace(/^not /, '');
          } else {
            determiner = 'must be';
          }

          var msg;

          if (endsWith(name, ' argument')) {
            // For cases like 'first argument'
            msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
          } else {
            var type = includes(name, '.') ? 'property' : 'argument';
            msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
          }

          msg += ". Received type ".concat(typeof actual);
          return msg;
        }, TypeError);
        createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
        createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
          return 'The ' + name + ' method is not implemented';
        });
        createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
        createErrorType('ERR_STREAM_DESTROYED', function (name) {
          return 'Cannot call ' + name + ' after a stream was destroyed';
        });
        createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
        createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
        createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
        createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
        createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
          return 'Unknown encoding: ' + arg;
        }, TypeError);
        createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
        module.exports.codes = codes;


        /***/
      }),

/***/ "./node_modules/readable-stream/lib/_stream_duplex.js":
/*!************************************************************!*\
  !*** ./node_modules/readable-stream/lib/_stream_duplex.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
/* provided dependency */ var process = __webpack_require__(/*! process */ "./node_modules/process/browser.js");
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.
        // a duplex stream is just a stream that is both readable and writable.
        // Since JS doesn't have multiple prototypal inheritance, this class
        // prototypally inherits from Readable, and then parasitically from
        // Writable.

        /*<replacement>*/

        var objectKeys = Object.keys || function (obj) {
          var keys = [];

          for (var key in obj) {
            keys.push(key);
          }

          return keys;
        };
        /*</replacement>*/


        module.exports = Duplex;

        var Readable = __webpack_require__(/*! ./_stream_readable */ "./node_modules/readable-stream/lib/_stream_readable.js");

        var Writable = __webpack_require__(/*! ./_stream_writable */ "./node_modules/readable-stream/lib/_stream_writable.js");

        __webpack_require__(/*! inherits */ "./node_modules/inherits/inherits_browser.js")(Duplex, Readable);

        {
          // Allow the keys array to be GC'ed.
          var keys = objectKeys(Writable.prototype);

          for (var v = 0; v < keys.length; v++) {
            var method = keys[v];
            if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
          }
        }

        function Duplex(options) {
          if (!(this instanceof Duplex)) return new Duplex(options);
          Readable.call(this, options);
          Writable.call(this, options);
          this.allowHalfOpen = true;

          if (options) {
            if (options.readable === false) this.readable = false;
            if (options.writable === false) this.writable = false;

            if (options.allowHalfOpen === false) {
              this.allowHalfOpen = false;
              this.once('end', onend);
            }
          }
        }

        Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._writableState.highWaterMark;
          }
        });
        Object.defineProperty(Duplex.prototype, 'writableBuffer', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._writableState && this._writableState.getBuffer();
          }
        });
        Object.defineProperty(Duplex.prototype, 'writableLength', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._writableState.length;
          }
        }); // the no-half-open enforcer

        function onend() {
          // If the writable side ended, then we're ok.
          if (this._writableState.ended) return; // no more data can be written.
          // But allow more writes to happen in this tick.

          process.nextTick(onEndNT, this);
        }

        function onEndNT(self) {
          self.end();
        }

        Object.defineProperty(Duplex.prototype, 'destroyed', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            if (this._readableState === undefined || this._writableState === undefined) {
              return false;
            }

            return this._readableState.destroyed && this._writableState.destroyed;
          },
          set: function set(value) {
            // we ignore the value if the stream
            // has not been initialized yet
            if (this._readableState === undefined || this._writableState === undefined) {
              return;
            } // backward compatibility, the user is explicitly
            // managing destroyed


            this._readableState.destroyed = value;
            this._writableState.destroyed = value;
          }
        });

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/_stream_passthrough.js":
/*!*****************************************************************!*\
  !*** ./node_modules/readable-stream/lib/_stream_passthrough.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.
        // a passthrough stream.
        // basically just the most minimal sort of Transform stream.
        // Every written chunk gets output as-is.


        module.exports = PassThrough;

        var Transform = __webpack_require__(/*! ./_stream_transform */ "./node_modules/readable-stream/lib/_stream_transform.js");

        __webpack_require__(/*! inherits */ "./node_modules/inherits/inherits_browser.js")(PassThrough, Transform);

        function PassThrough(options) {
          if (!(this instanceof PassThrough)) return new PassThrough(options);
          Transform.call(this, options);
        }

        PassThrough.prototype._transform = function (chunk, encoding, cb) {
          cb(null, chunk);
        };

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/_stream_readable.js":
/*!**************************************************************!*\
  !*** ./node_modules/readable-stream/lib/_stream_readable.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
/* provided dependency */ var process = __webpack_require__(/*! process */ "./node_modules/process/browser.js");
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.


        module.exports = Readable;
        /*<replacement>*/

        var Duplex;
        /*</replacement>*/

        Readable.ReadableState = ReadableState;
        /*<replacement>*/

        var EE = (__webpack_require__(/*! events */ "./node_modules/events/events.js").EventEmitter);

        var EElistenerCount = function EElistenerCount(emitter, type) {
          return emitter.listeners(type).length;
        };
        /*</replacement>*/

        /*<replacement>*/


        var Stream = __webpack_require__(/*! ./internal/streams/stream */ "./node_modules/readable-stream/lib/internal/streams/stream-browser.js");
        /*</replacement>*/


        var Buffer = (__webpack_require__(/*! buffer */ "./node_modules/buffer/index.js").Buffer);

        var OurUint8Array = __webpack_require__.g.Uint8Array || function () { };

        function _uint8ArrayToBuffer(chunk) {
          return Buffer.from(chunk);
        }

        function _isUint8Array(obj) {
          return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
        }
        /*<replacement>*/


        var debugUtil = __webpack_require__(/*! util */ "?d17e");

        var debug;

        if (debugUtil && debugUtil.debuglog) {
          debug = debugUtil.debuglog('stream');
        } else {
          debug = function debug() { };
        }
        /*</replacement>*/


        var BufferList = __webpack_require__(/*! ./internal/streams/buffer_list */ "./node_modules/readable-stream/lib/internal/streams/buffer_list.js");

        var destroyImpl = __webpack_require__(/*! ./internal/streams/destroy */ "./node_modules/readable-stream/lib/internal/streams/destroy.js");

        var _require = __webpack_require__(/*! ./internal/streams/state */ "./node_modules/readable-stream/lib/internal/streams/state.js"),
          getHighWaterMark = _require.getHighWaterMark;

        var _require$codes = (__webpack_require__(/*! ../errors */ "./node_modules/readable-stream/errors-browser.js").codes),
          ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
          ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
          ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
          ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT; // Lazy loaded to improve the startup performance.


        var StringDecoder;
        var createReadableStreamAsyncIterator;
        var from;

        __webpack_require__(/*! inherits */ "./node_modules/inherits/inherits_browser.js")(Readable, Stream);

        var errorOrDestroy = destroyImpl.errorOrDestroy;
        var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

        function prependListener(emitter, event, fn) {
          // Sadly this is not cacheable as some libraries bundle their own
          // event emitter implementation with them.
          if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn); // This is a hack to make sure that our error handler is attached before any
          // userland ones.  NEVER DO THIS. This is here only because this code needs
          // to continue to work with older versions of Node.js that do not include
          // the prependListener() method. The goal is to eventually remove this hack.

          if (!emitter._events || !emitter._events[event]) emitter.on(event, fn); else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn); else emitter._events[event] = [fn, emitter._events[event]];
        }

        function ReadableState(options, stream, isDuplex) {
          Duplex = Duplex || __webpack_require__(/*! ./_stream_duplex */ "./node_modules/readable-stream/lib/_stream_duplex.js");
          options = options || {}; // Duplex streams are both readable and writable, but share
          // the same options object.
          // However, some cases require setting options to different
          // values for the readable and the writable sides of the duplex stream.
          // These options can be provided separately as readableXXX and writableXXX.

          if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag. Used to make read(n) ignore n and to
          // make all the buffer merging and length checks go away

          this.objectMode = !!options.objectMode;
          if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode; // the point at which it stops calling _read() to fill the buffer
          // Note: 0 is a valid value, means "don't call _read preemptively ever"

          this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex); // A linked list is used to store data chunks instead of an array because the
          // linked list can remove elements from the beginning faster than
          // array.shift()

          this.buffer = new BufferList();
          this.length = 0;
          this.pipes = null;
          this.pipesCount = 0;
          this.flowing = null;
          this.ended = false;
          this.endEmitted = false;
          this.reading = false; // a flag to be able to tell if the event 'readable'/'data' is emitted
          // immediately, or on a later tick.  We set this to true at first, because
          // any actions that shouldn't happen until "later" should generally also
          // not happen before the first read call.

          this.sync = true; // whenever we return null, then we set a flag to say
          // that we're awaiting a 'readable' event emission.

          this.needReadable = false;
          this.emittedReadable = false;
          this.readableListening = false;
          this.resumeScheduled = false;
          this.paused = true; // Should close be emitted on destroy. Defaults to true.

          this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'end' (and potentially 'finish')

          this.autoDestroy = !!options.autoDestroy; // has it been destroyed

          this.destroyed = false; // Crypto is kind of old and crusty.  Historically, its default string
          // encoding is 'binary' so we have to make this configurable.
          // Everything else in the universe uses 'utf8', though.

          this.defaultEncoding = options.defaultEncoding || 'utf8'; // the number of writers that are awaiting a drain event in .pipe()s

          this.awaitDrain = 0; // if true, a maybeReadMore has been scheduled

          this.readingMore = false;
          this.decoder = null;
          this.encoding = null;

          if (options.encoding) {
            if (!StringDecoder) StringDecoder = (__webpack_require__(/*! string_decoder/ */ "./node_modules/string_decoder/lib/string_decoder.js").StringDecoder);
            this.decoder = new StringDecoder(options.encoding);
            this.encoding = options.encoding;
          }
        }

        function Readable(options) {
          Duplex = Duplex || __webpack_require__(/*! ./_stream_duplex */ "./node_modules/readable-stream/lib/_stream_duplex.js");
          if (!(this instanceof Readable)) return new Readable(options); // Checking for a Stream.Duplex instance is faster here instead of inside
          // the ReadableState constructor, at least with V8 6.5

          var isDuplex = this instanceof Duplex;
          this._readableState = new ReadableState(options, this, isDuplex); // legacy

          this.readable = true;

          if (options) {
            if (typeof options.read === 'function') this._read = options.read;
            if (typeof options.destroy === 'function') this._destroy = options.destroy;
          }

          Stream.call(this);
        }

        Object.defineProperty(Readable.prototype, 'destroyed', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            if (this._readableState === undefined) {
              return false;
            }

            return this._readableState.destroyed;
          },
          set: function set(value) {
            // we ignore the value if the stream
            // has not been initialized yet
            if (!this._readableState) {
              return;
            } // backward compatibility, the user is explicitly
            // managing destroyed


            this._readableState.destroyed = value;
          }
        });
        Readable.prototype.destroy = destroyImpl.destroy;
        Readable.prototype._undestroy = destroyImpl.undestroy;

        Readable.prototype._destroy = function (err, cb) {
          cb(err);
        }; // Manually shove something into the read() buffer.
        // This returns true if the highWaterMark has not been hit yet,
        // similar to how Writable.write() returns true if you should
        // write() some more.


        Readable.prototype.push = function (chunk, encoding) {
          var state = this._readableState;
          var skipChunkCheck;

          if (!state.objectMode) {
            if (typeof chunk === 'string') {
              encoding = encoding || state.defaultEncoding;

              if (encoding !== state.encoding) {
                chunk = Buffer.from(chunk, encoding);
                encoding = '';
              }

              skipChunkCheck = true;
            }
          } else {
            skipChunkCheck = true;
          }

          return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
        }; // Unshift should *always* be something directly out of read()


        Readable.prototype.unshift = function (chunk) {
          return readableAddChunk(this, chunk, null, true, false);
        };

        function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
          debug('readableAddChunk', chunk);
          var state = stream._readableState;

          if (chunk === null) {
            state.reading = false;
            onEofChunk(stream, state);
          } else {
            var er;
            if (!skipChunkCheck) er = chunkInvalid(state, chunk);

            if (er) {
              errorOrDestroy(stream, er);
            } else if (state.objectMode || chunk && chunk.length > 0) {
              if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
                chunk = _uint8ArrayToBuffer(chunk);
              }

              if (addToFront) {
                if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT()); else addChunk(stream, state, chunk, true);
              } else if (state.ended) {
                errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
              } else if (state.destroyed) {
                return false;
              } else {
                state.reading = false;

                if (state.decoder && !encoding) {
                  chunk = state.decoder.write(chunk);
                  if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false); else maybeReadMore(stream, state);
                } else {
                  addChunk(stream, state, chunk, false);
                }
              }
            } else if (!addToFront) {
              state.reading = false;
              maybeReadMore(stream, state);
            }
          } // We can push more data if we are below the highWaterMark.
          // Also, if we have no data yet, we can stand some more bytes.
          // This is to work around cases where hwm=0, such as the repl.


          return !state.ended && (state.length < state.highWaterMark || state.length === 0);
        }

        function addChunk(stream, state, chunk, addToFront) {
          if (state.flowing && state.length === 0 && !state.sync) {
            state.awaitDrain = 0;
            stream.emit('data', chunk);
          } else {
            // update the buffer info.
            state.length += state.objectMode ? 1 : chunk.length;
            if (addToFront) state.buffer.unshift(chunk); else state.buffer.push(chunk);
            if (state.needReadable) emitReadable(stream);
          }

          maybeReadMore(stream, state);
        }

        function chunkInvalid(state, chunk) {
          var er;

          if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
            er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
          }

          return er;
        }

        Readable.prototype.isPaused = function () {
          return this._readableState.flowing === false;
        }; // backwards compatibility.


        Readable.prototype.setEncoding = function (enc) {
          if (!StringDecoder) StringDecoder = (__webpack_require__(/*! string_decoder/ */ "./node_modules/string_decoder/lib/string_decoder.js").StringDecoder);
          var decoder = new StringDecoder(enc);
          this._readableState.decoder = decoder; // If setEncoding(null), decoder.encoding equals utf8

          this._readableState.encoding = this._readableState.decoder.encoding; // Iterate over current buffer to convert already stored Buffers:

          var p = this._readableState.buffer.head;
          var content = '';

          while (p !== null) {
            content += decoder.write(p.data);
            p = p.next;
          }

          this._readableState.buffer.clear();

          if (content !== '') this._readableState.buffer.push(content);
          this._readableState.length = content.length;
          return this;
        }; // Don't raise the hwm > 1GB


        var MAX_HWM = 0x40000000;

        function computeNewHighWaterMark(n) {
          if (n >= MAX_HWM) {
            // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
            n = MAX_HWM;
          } else {
            // Get the next highest power of 2 to prevent increasing hwm excessively in
            // tiny amounts
            n--;
            n |= n >>> 1;
            n |= n >>> 2;
            n |= n >>> 4;
            n |= n >>> 8;
            n |= n >>> 16;
            n++;
          }

          return n;
        } // This function is designed to be inlinable, so please take care when making
        // changes to the function body.


        function howMuchToRead(n, state) {
          if (n <= 0 || state.length === 0 && state.ended) return 0;
          if (state.objectMode) return 1;

          if (n !== n) {
            // Only flow one buffer at a time
            if (state.flowing && state.length) return state.buffer.head.data.length; else return state.length;
          } // If we're asking for more than the current hwm, then raise the hwm.


          if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
          if (n <= state.length) return n; // Don't have enough

          if (!state.ended) {
            state.needReadable = true;
            return 0;
          }

          return state.length;
        } // you can override either this method, or the async _read(n) below.


        Readable.prototype.read = function (n) {
          debug('read', n);
          n = parseInt(n, 10);
          var state = this._readableState;
          var nOrig = n;
          if (n !== 0) state.emittedReadable = false; // if we're doing read(0) to trigger a readable event, but we
          // already have a bunch of data in the buffer, then just trigger
          // the 'readable' event and move on.

          if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
            debug('read: emitReadable', state.length, state.ended);
            if (state.length === 0 && state.ended) endReadable(this); else emitReadable(this);
            return null;
          }

          n = howMuchToRead(n, state); // if we've ended, and we're now clear, then finish it up.

          if (n === 0 && state.ended) {
            if (state.length === 0) endReadable(this);
            return null;
          } // All the actual chunk generation logic needs to be
          // *below* the call to _read.  The reason is that in certain
          // synthetic stream cases, such as passthrough streams, _read
          // may be a completely synchronous operation which may change
          // the state of the read buffer, providing enough data when
          // before there was *not* enough.
          //
          // So, the steps are:
          // 1. Figure out what the state of things will be after we do
          // a read from the buffer.
          //
          // 2. If that resulting state will trigger a _read, then call _read.
          // Note that this may be asynchronous, or synchronous.  Yes, it is
          // deeply ugly to write APIs this way, but that still doesn't mean
          // that the Readable class should behave improperly, as streams are
          // designed to be sync/async agnostic.
          // Take note if the _read call is sync or async (ie, if the read call
          // has returned yet), so that we know whether or not it's safe to emit
          // 'readable' etc.
          //
          // 3. Actually pull the requested chunks out of the buffer and return.
          // if we need a readable event, then we need to do some reading.


          var doRead = state.needReadable;
          debug('need readable', doRead); // if we currently have less than the highWaterMark, then also read some

          if (state.length === 0 || state.length - n < state.highWaterMark) {
            doRead = true;
            debug('length less than watermark', doRead);
          } // however, if we've ended, then there's no point, and if we're already
          // reading, then it's unnecessary.


          if (state.ended || state.reading) {
            doRead = false;
            debug('reading or ended', doRead);
          } else if (doRead) {
            debug('do read');
            state.reading = true;
            state.sync = true; // if the length is currently zero, then we *need* a readable event.

            if (state.length === 0) state.needReadable = true; // call internal read method

            this._read(state.highWaterMark);

            state.sync = false; // If _read pushed data synchronously, then `reading` will be false,
            // and we need to re-evaluate how much data we can return to the user.

            if (!state.reading) n = howMuchToRead(nOrig, state);
          }

          var ret;
          if (n > 0) ret = fromList(n, state); else ret = null;

          if (ret === null) {
            state.needReadable = state.length <= state.highWaterMark;
            n = 0;
          } else {
            state.length -= n;
            state.awaitDrain = 0;
          }

          if (state.length === 0) {
            // If we have nothing in the buffer, then we want to know
            // as soon as we *do* get something into the buffer.
            if (!state.ended) state.needReadable = true; // If we tried to read() past the EOF, then emit end on the next tick.

            if (nOrig !== n && state.ended) endReadable(this);
          }

          if (ret !== null) this.emit('data', ret);
          return ret;
        };

        function onEofChunk(stream, state) {
          debug('onEofChunk');
          if (state.ended) return;

          if (state.decoder) {
            var chunk = state.decoder.end();

            if (chunk && chunk.length) {
              state.buffer.push(chunk);
              state.length += state.objectMode ? 1 : chunk.length;
            }
          }

          state.ended = true;

          if (state.sync) {
            // if we are sync, wait until next tick to emit the data.
            // Otherwise we risk emitting data in the flow()
            // the readable code triggers during a read() call
            emitReadable(stream);
          } else {
            // emit 'readable' now to make sure it gets picked up.
            state.needReadable = false;

            if (!state.emittedReadable) {
              state.emittedReadable = true;
              emitReadable_(stream);
            }
          }
        } // Don't emit readable right away in sync mode, because this can trigger
        // another read() call => stack overflow.  This way, it might trigger
        // a nextTick recursion warning, but that's not so bad.


        function emitReadable(stream) {
          var state = stream._readableState;
          debug('emitReadable', state.needReadable, state.emittedReadable);
          state.needReadable = false;

          if (!state.emittedReadable) {
            debug('emitReadable', state.flowing);
            state.emittedReadable = true;
            process.nextTick(emitReadable_, stream);
          }
        }

        function emitReadable_(stream) {
          var state = stream._readableState;
          debug('emitReadable_', state.destroyed, state.length, state.ended);

          if (!state.destroyed && (state.length || state.ended)) {
            stream.emit('readable');
            state.emittedReadable = false;
          } // The stream needs another readable event if
          // 1. It is not flowing, as the flow mechanism will take
          //    care of it.
          // 2. It is not ended.
          // 3. It is below the highWaterMark, so we can schedule
          //    another readable later.


          state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
          flow(stream);
        } // at this point, the user has presumably seen the 'readable' event,
        // and called read() to consume some data.  that may have triggered
        // in turn another _read(n) call, in which case reading = true if
        // it's in progress.
        // However, if we're not ended, or reading, and the length < hwm,
        // then go ahead and try to read some more preemptively.


        function maybeReadMore(stream, state) {
          if (!state.readingMore) {
            state.readingMore = true;
            process.nextTick(maybeReadMore_, stream, state);
          }
        }

        function maybeReadMore_(stream, state) {
          // Attempt to read more data if we should.
          //
          // The conditions for reading more data are (one of):
          // - Not enough data buffered (state.length < state.highWaterMark). The loop
          //   is responsible for filling the buffer with enough data if such data
          //   is available. If highWaterMark is 0 and we are not in the flowing mode
          //   we should _not_ attempt to buffer any extra data. We'll get more data
          //   when the stream consumer calls read() instead.
          // - No data in the buffer, and the stream is in flowing mode. In this mode
          //   the loop below is responsible for ensuring read() is called. Failing to
          //   call read here would abort the flow and there's no other mechanism for
          //   continuing the flow if the stream consumer has just subscribed to the
          //   'data' event.
          //
          // In addition to the above conditions to keep reading data, the following
          // conditions prevent the data from being read:
          // - The stream has ended (state.ended).
          // - There is already a pending 'read' operation (state.reading). This is a
          //   case where the the stream has called the implementation defined _read()
          //   method, but they are processing the call asynchronously and have _not_
          //   called push() with new data. In this case we skip performing more
          //   read()s. The execution ends in this method again after the _read() ends
          //   up calling push() with more data.
          while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
            var len = state.length;
            debug('maybeReadMore read 0');
            stream.read(0);
            if (len === state.length) // didn't get any data, stop spinning.
              break;
          }

          state.readingMore = false;
        } // abstract method.  to be overridden in specific implementation classes.
        // call cb(er, data) where data is <= n in length.
        // for virtual (non-string, non-buffer) streams, "length" is somewhat
        // arbitrary, and perhaps not very meaningful.


        Readable.prototype._read = function (n) {
          errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
        };

        Readable.prototype.pipe = function (dest, pipeOpts) {
          var src = this;
          var state = this._readableState;

          switch (state.pipesCount) {
            case 0:
              state.pipes = dest;
              break;

            case 1:
              state.pipes = [state.pipes, dest];
              break;

            default:
              state.pipes.push(dest);
              break;
          }

          state.pipesCount += 1;
          debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
          var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
          var endFn = doEnd ? onend : unpipe;
          if (state.endEmitted) process.nextTick(endFn); else src.once('end', endFn);
          dest.on('unpipe', onunpipe);

          function onunpipe(readable, unpipeInfo) {
            debug('onunpipe');

            if (readable === src) {
              if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
                unpipeInfo.hasUnpiped = true;
                cleanup();
              }
            }
          }

          function onend() {
            debug('onend');
            dest.end();
          } // when the dest drains, it reduces the awaitDrain counter
          // on the source.  This would be more elegant with a .once()
          // handler in flow(), but adding and removing repeatedly is
          // too slow.


          var ondrain = pipeOnDrain(src);
          dest.on('drain', ondrain);
          var cleanedUp = false;

          function cleanup() {
            debug('cleanup'); // cleanup event handlers once the pipe is broken

            dest.removeListener('close', onclose);
            dest.removeListener('finish', onfinish);
            dest.removeListener('drain', ondrain);
            dest.removeListener('error', onerror);
            dest.removeListener('unpipe', onunpipe);
            src.removeListener('end', onend);
            src.removeListener('end', unpipe);
            src.removeListener('data', ondata);
            cleanedUp = true; // if the reader is waiting for a drain event from this
            // specific writer, then it would cause it to never start
            // flowing again.
            // So, if this is awaiting a drain, then we just call it now.
            // If we don't know, then assume that we are waiting for one.

            if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
          }

          src.on('data', ondata);

          function ondata(chunk) {
            debug('ondata');
            var ret = dest.write(chunk);
            debug('dest.write', ret);

            if (ret === false) {
              // If the user unpiped during `dest.write()`, it is possible
              // to get stuck in a permanently paused state if that write
              // also returned false.
              // => Check whether `dest` is still a piping destination.
              if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
                debug('false write response, pause', state.awaitDrain);
                state.awaitDrain++;
              }

              src.pause();
            }
          } // if the dest has an error, then stop piping into it.
          // however, don't suppress the throwing behavior for this.


          function onerror(er) {
            debug('onerror', er);
            unpipe();
            dest.removeListener('error', onerror);
            if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
          } // Make sure our error handler is attached before userland ones.


          prependListener(dest, 'error', onerror); // Both close and finish should trigger unpipe, but only once.

          function onclose() {
            dest.removeListener('finish', onfinish);
            unpipe();
          }

          dest.once('close', onclose);

          function onfinish() {
            debug('onfinish');
            dest.removeListener('close', onclose);
            unpipe();
          }

          dest.once('finish', onfinish);

          function unpipe() {
            debug('unpipe');
            src.unpipe(dest);
          } // tell the dest that it's being piped to


          dest.emit('pipe', src); // start the flow if it hasn't been started already.

          if (!state.flowing) {
            debug('pipe resume');
            src.resume();
          }

          return dest;
        };

        function pipeOnDrain(src) {
          return function pipeOnDrainFunctionResult() {
            var state = src._readableState;
            debug('pipeOnDrain', state.awaitDrain);
            if (state.awaitDrain) state.awaitDrain--;

            if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
              state.flowing = true;
              flow(src);
            }
          };
        }

        Readable.prototype.unpipe = function (dest) {
          var state = this._readableState;
          var unpipeInfo = {
            hasUnpiped: false
          }; // if we're not piping anywhere, then do nothing.

          if (state.pipesCount === 0) return this; // just one destination.  most common case.

          if (state.pipesCount === 1) {
            // passed in one, but it's not the right one.
            if (dest && dest !== state.pipes) return this;
            if (!dest) dest = state.pipes; // got a match.

            state.pipes = null;
            state.pipesCount = 0;
            state.flowing = false;
            if (dest) dest.emit('unpipe', this, unpipeInfo);
            return this;
          } // slow case. multiple pipe destinations.


          if (!dest) {
            // remove all.
            var dests = state.pipes;
            var len = state.pipesCount;
            state.pipes = null;
            state.pipesCount = 0;
            state.flowing = false;

            for (var i = 0; i < len; i++) {
              dests[i].emit('unpipe', this, {
                hasUnpiped: false
              });
            }

            return this;
          } // try to find the right one.


          var index = indexOf(state.pipes, dest);
          if (index === -1) return this;
          state.pipes.splice(index, 1);
          state.pipesCount -= 1;
          if (state.pipesCount === 1) state.pipes = state.pipes[0];
          dest.emit('unpipe', this, unpipeInfo);
          return this;
        }; // set up data events if they are asked for
        // Ensure readable listeners eventually get something


        Readable.prototype.on = function (ev, fn) {
          var res = Stream.prototype.on.call(this, ev, fn);
          var state = this._readableState;

          if (ev === 'data') {
            // update readableListening so that resume() may be a no-op
            // a few lines down. This is needed to support once('readable').
            state.readableListening = this.listenerCount('readable') > 0; // Try start flowing on next tick if stream isn't explicitly paused

            if (state.flowing !== false) this.resume();
          } else if (ev === 'readable') {
            if (!state.endEmitted && !state.readableListening) {
              state.readableListening = state.needReadable = true;
              state.flowing = false;
              state.emittedReadable = false;
              debug('on readable', state.length, state.reading);

              if (state.length) {
                emitReadable(this);
              } else if (!state.reading) {
                process.nextTick(nReadingNextTick, this);
              }
            }
          }

          return res;
        };

        Readable.prototype.addListener = Readable.prototype.on;

        Readable.prototype.removeListener = function (ev, fn) {
          var res = Stream.prototype.removeListener.call(this, ev, fn);

          if (ev === 'readable') {
            // We need to check if there is someone still listening to
            // readable and reset the state. However this needs to happen
            // after readable has been emitted but before I/O (nextTick) to
            // support once('readable', fn) cycles. This means that calling
            // resume within the same tick will have no
            // effect.
            process.nextTick(updateReadableListening, this);
          }

          return res;
        };

        Readable.prototype.removeAllListeners = function (ev) {
          var res = Stream.prototype.removeAllListeners.apply(this, arguments);

          if (ev === 'readable' || ev === undefined) {
            // We need to check if there is someone still listening to
            // readable and reset the state. However this needs to happen
            // after readable has been emitted but before I/O (nextTick) to
            // support once('readable', fn) cycles. This means that calling
            // resume within the same tick will have no
            // effect.
            process.nextTick(updateReadableListening, this);
          }

          return res;
        };

        function updateReadableListening(self) {
          var state = self._readableState;
          state.readableListening = self.listenerCount('readable') > 0;

          if (state.resumeScheduled && !state.paused) {
            // flowing needs to be set to true now, otherwise
            // the upcoming resume will not flow.
            state.flowing = true; // crude way to check if we should resume
          } else if (self.listenerCount('data') > 0) {
            self.resume();
          }
        }

        function nReadingNextTick(self) {
          debug('readable nexttick read 0');
          self.read(0);
        } // pause() and resume() are remnants of the legacy readable stream API
        // If the user uses them, then switch into old mode.


        Readable.prototype.resume = function () {
          var state = this._readableState;

          if (!state.flowing) {
            debug('resume'); // we flow only if there is no one listening
            // for readable, but we still have to call
            // resume()

            state.flowing = !state.readableListening;
            resume(this, state);
          }

          state.paused = false;
          return this;
        };

        function resume(stream, state) {
          if (!state.resumeScheduled) {
            state.resumeScheduled = true;
            process.nextTick(resume_, stream, state);
          }
        }

        function resume_(stream, state) {
          debug('resume', state.reading);

          if (!state.reading) {
            stream.read(0);
          }

          state.resumeScheduled = false;
          stream.emit('resume');
          flow(stream);
          if (state.flowing && !state.reading) stream.read(0);
        }

        Readable.prototype.pause = function () {
          debug('call pause flowing=%j', this._readableState.flowing);

          if (this._readableState.flowing !== false) {
            debug('pause');
            this._readableState.flowing = false;
            this.emit('pause');
          }

          this._readableState.paused = true;
          return this;
        };

        function flow(stream) {
          var state = stream._readableState;
          debug('flow', state.flowing);

          while (state.flowing && stream.read() !== null) {
            ;
          }
        } // wrap an old-style stream as the async data source.
        // This is *not* part of the readable stream interface.
        // It is an ugly unfortunate mess of history.


        Readable.prototype.wrap = function (stream) {
          var _this = this;

          var state = this._readableState;
          var paused = false;
          stream.on('end', function () {
            debug('wrapped end');

            if (state.decoder && !state.ended) {
              var chunk = state.decoder.end();
              if (chunk && chunk.length) _this.push(chunk);
            }

            _this.push(null);
          });
          stream.on('data', function (chunk) {
            debug('wrapped data');
            if (state.decoder) chunk = state.decoder.write(chunk); // don't skip over falsy values in objectMode

            if (state.objectMode && (chunk === null || chunk === undefined)) return; else if (!state.objectMode && (!chunk || !chunk.length)) return;

            var ret = _this.push(chunk);

            if (!ret) {
              paused = true;
              stream.pause();
            }
          }); // proxy all the other methods.
          // important when wrapping filters and duplexes.

          for (var i in stream) {
            if (this[i] === undefined && typeof stream[i] === 'function') {
              this[i] = function methodWrap(method) {
                return function methodWrapReturnFunction() {
                  return stream[method].apply(stream, arguments);
                };
              }(i);
            }
          } // proxy certain important events.


          for (var n = 0; n < kProxyEvents.length; n++) {
            stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
          } // when we try to consume some more bytes, simply unpause the
          // underlying stream.


          this._read = function (n) {
            debug('wrapped _read', n);

            if (paused) {
              paused = false;
              stream.resume();
            }
          };

          return this;
        };

        if (typeof Symbol === 'function') {
          Readable.prototype[Symbol.asyncIterator] = function () {
            if (createReadableStreamAsyncIterator === undefined) {
              createReadableStreamAsyncIterator = __webpack_require__(/*! ./internal/streams/async_iterator */ "./node_modules/readable-stream/lib/internal/streams/async_iterator.js");
            }

            return createReadableStreamAsyncIterator(this);
          };
        }

        Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._readableState.highWaterMark;
          }
        });
        Object.defineProperty(Readable.prototype, 'readableBuffer', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._readableState && this._readableState.buffer;
          }
        });
        Object.defineProperty(Readable.prototype, 'readableFlowing', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._readableState.flowing;
          },
          set: function set(state) {
            if (this._readableState) {
              this._readableState.flowing = state;
            }
          }
        }); // exposed for testing purposes only.

        Readable._fromList = fromList;
        Object.defineProperty(Readable.prototype, 'readableLength', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._readableState.length;
          }
        }); // Pluck off n bytes from an array of buffers.
        // Length is the combined lengths of all the buffers in the list.
        // This function is designed to be inlinable, so please take care when making
        // changes to the function body.

        function fromList(n, state) {
          // nothing buffered
          if (state.length === 0) return null;
          var ret;
          if (state.objectMode) ret = state.buffer.shift(); else if (!n || n >= state.length) {
            // read it all, truncate the list
            if (state.decoder) ret = state.buffer.join(''); else if (state.buffer.length === 1) ret = state.buffer.first(); else ret = state.buffer.concat(state.length);
            state.buffer.clear();
          } else {
            // read part of list
            ret = state.buffer.consume(n, state.decoder);
          }
          return ret;
        }

        function endReadable(stream) {
          var state = stream._readableState;
          debug('endReadable', state.endEmitted);

          if (!state.endEmitted) {
            state.ended = true;
            process.nextTick(endReadableNT, state, stream);
          }
        }

        function endReadableNT(state, stream) {
          debug('endReadableNT', state.endEmitted, state.length); // Check that we didn't get one last unshift.

          if (!state.endEmitted && state.length === 0) {
            state.endEmitted = true;
            stream.readable = false;
            stream.emit('end');

            if (state.autoDestroy) {
              // In case of duplex streams we need a way to detect
              // if the writable side is ready for autoDestroy as well
              var wState = stream._writableState;

              if (!wState || wState.autoDestroy && wState.finished) {
                stream.destroy();
              }
            }
          }
        }

        if (typeof Symbol === 'function') {
          Readable.from = function (iterable, opts) {
            if (from === undefined) {
              from = __webpack_require__(/*! ./internal/streams/from */ "./node_modules/readable-stream/lib/internal/streams/from-browser.js");
            }

            return from(Readable, iterable, opts);
          };
        }

        function indexOf(xs, x) {
          for (var i = 0, l = xs.length; i < l; i++) {
            if (xs[i] === x) return i;
          }

          return -1;
        }

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/_stream_transform.js":
/*!***************************************************************!*\
  !*** ./node_modules/readable-stream/lib/_stream_transform.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.
        // a transform stream is a readable/writable stream where you do
        // something with the data.  Sometimes it's called a "filter",
        // but that's not a great name for it, since that implies a thing where
        // some bits pass through, and others are simply ignored.  (That would
        // be a valid example of a transform, of course.)
        //
        // While the output is causally related to the input, it's not a
        // necessarily symmetric or synchronous transformation.  For example,
        // a zlib stream might take multiple plain-text writes(), and then
        // emit a single compressed chunk some time in the future.
        //
        // Here's how this works:
        //
        // The Transform stream has all the aspects of the readable and writable
        // stream classes.  When you write(chunk), that calls _write(chunk,cb)
        // internally, and returns false if there's a lot of pending writes
        // buffered up.  When you call read(), that calls _read(n) until
        // there's enough pending readable data buffered up.
        //
        // In a transform stream, the written data is placed in a buffer.  When
        // _read(n) is called, it transforms the queued up data, calling the
        // buffered _write cb's as it consumes chunks.  If consuming a single
        // written chunk would result in multiple output chunks, then the first
        // outputted bit calls the readcb, and subsequent chunks just go into
        // the read buffer, and will cause it to emit 'readable' if necessary.
        //
        // This way, back-pressure is actually determined by the reading side,
        // since _read has to be called to start processing a new chunk.  However,
        // a pathological inflate type of transform can cause excessive buffering
        // here.  For example, imagine a stream where every byte of input is
        // interpreted as an integer from 0-255, and then results in that many
        // bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
        // 1kb of data being output.  In this case, you could write a very small
        // amount of input, and end up with a very large amount of output.  In
        // such a pathological inflating mechanism, there'd be no way to tell
        // the system to stop doing the transform.  A single 4MB write could
        // cause the system to run out of memory.
        //
        // However, even in such a pathological case, only a single written chunk
        // would be consumed, and then the rest would wait (un-transformed) until
        // the results of the previous transformed chunk were consumed.


        module.exports = Transform;

        var _require$codes = (__webpack_require__(/*! ../errors */ "./node_modules/readable-stream/errors-browser.js").codes),
          ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
          ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
          ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
          ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;

        var Duplex = __webpack_require__(/*! ./_stream_duplex */ "./node_modules/readable-stream/lib/_stream_duplex.js");

        __webpack_require__(/*! inherits */ "./node_modules/inherits/inherits_browser.js")(Transform, Duplex);

        function afterTransform(er, data) {
          var ts = this._transformState;
          ts.transforming = false;
          var cb = ts.writecb;

          if (cb === null) {
            return this.emit('error', new ERR_MULTIPLE_CALLBACK());
          }

          ts.writechunk = null;
          ts.writecb = null;
          if (data != null) // single equals check for both `null` and `undefined`
            this.push(data);
          cb(er);
          var rs = this._readableState;
          rs.reading = false;

          if (rs.needReadable || rs.length < rs.highWaterMark) {
            this._read(rs.highWaterMark);
          }
        }

        function Transform(options) {
          if (!(this instanceof Transform)) return new Transform(options);
          Duplex.call(this, options);
          this._transformState = {
            afterTransform: afterTransform.bind(this),
            needTransform: false,
            transforming: false,
            writecb: null,
            writechunk: null,
            writeencoding: null
          }; // start out asking for a readable event once data is transformed.

          this._readableState.needReadable = true; // we have implemented the _read method, and done the other things
          // that Readable wants before the first _read call, so unset the
          // sync guard flag.

          this._readableState.sync = false;

          if (options) {
            if (typeof options.transform === 'function') this._transform = options.transform;
            if (typeof options.flush === 'function') this._flush = options.flush;
          } // When the writable side finishes, then flush out anything remaining.


          this.on('prefinish', prefinish);
        }

        function prefinish() {
          var _this = this;

          if (typeof this._flush === 'function' && !this._readableState.destroyed) {
            this._flush(function (er, data) {
              done(_this, er, data);
            });
          } else {
            done(this, null, null);
          }
        }

        Transform.prototype.push = function (chunk, encoding) {
          this._transformState.needTransform = false;
          return Duplex.prototype.push.call(this, chunk, encoding);
        }; // This is the part where you do stuff!
        // override this function in implementation classes.
        // 'chunk' is an input chunk.
        //
        // Call `push(newChunk)` to pass along transformed output
        // to the readable side.  You may call 'push' zero or more times.
        //
        // Call `cb(err)` when you are done with this chunk.  If you pass
        // an error, then that'll put the hurt on the whole operation.  If you
        // never call cb(), then you'll never get another chunk.


        Transform.prototype._transform = function (chunk, encoding, cb) {
          cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
        };

        Transform.prototype._write = function (chunk, encoding, cb) {
          var ts = this._transformState;
          ts.writecb = cb;
          ts.writechunk = chunk;
          ts.writeencoding = encoding;

          if (!ts.transforming) {
            var rs = this._readableState;
            if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
          }
        }; // Doesn't matter what the args are here.
        // _transform does all the work.
        // That we got here means that the readable side wants more data.


        Transform.prototype._read = function (n) {
          var ts = this._transformState;

          if (ts.writechunk !== null && !ts.transforming) {
            ts.transforming = true;

            this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
          } else {
            // mark that we need a transform, so that any data that comes in
            // will get processed, now that we've asked for it.
            ts.needTransform = true;
          }
        };

        Transform.prototype._destroy = function (err, cb) {
          Duplex.prototype._destroy.call(this, err, function (err2) {
            cb(err2);
          });
        };

        function done(stream, er, data) {
          if (er) return stream.emit('error', er);
          if (data != null) // single equals check for both `null` and `undefined`
            stream.push(data); // TODO(BridgeAR): Write a test for these two error cases
          // if there's nothing in the write buffer, then that means
          // that nothing more will ever be provided

          if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
          if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
          return stream.push(null);
        }

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/_stream_writable.js":
/*!**************************************************************!*\
  !*** ./node_modules/readable-stream/lib/_stream_writable.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
/* provided dependency */ var process = __webpack_require__(/*! process */ "./node_modules/process/browser.js");
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.
        // A bit simpler than readable streams.
        // Implement an async ._write(chunk, encoding, cb), and it'll handle all
        // the drain event emission and buffering.


        module.exports = Writable;
        /* <replacement> */

        function WriteReq(chunk, encoding, cb) {
          this.chunk = chunk;
          this.encoding = encoding;
          this.callback = cb;
          this.next = null;
        } // It seems a linked list but it is not
        // there will be only 2 of these for each stream


        function CorkedRequest(state) {
          var _this = this;

          this.next = null;
          this.entry = null;

          this.finish = function () {
            onCorkedFinish(_this, state);
          };
        }
        /* </replacement> */

        /*<replacement>*/


        var Duplex;
        /*</replacement>*/

        Writable.WritableState = WritableState;
        /*<replacement>*/

        var internalUtil = {
          deprecate: __webpack_require__(/*! util-deprecate */ "./node_modules/util-deprecate/browser.js")
        };
        /*</replacement>*/

        /*<replacement>*/

        var Stream = __webpack_require__(/*! ./internal/streams/stream */ "./node_modules/readable-stream/lib/internal/streams/stream-browser.js");
        /*</replacement>*/


        var Buffer = (__webpack_require__(/*! buffer */ "./node_modules/buffer/index.js").Buffer);

        var OurUint8Array = __webpack_require__.g.Uint8Array || function () { };

        function _uint8ArrayToBuffer(chunk) {
          return Buffer.from(chunk);
        }

        function _isUint8Array(obj) {
          return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
        }

        var destroyImpl = __webpack_require__(/*! ./internal/streams/destroy */ "./node_modules/readable-stream/lib/internal/streams/destroy.js");

        var _require = __webpack_require__(/*! ./internal/streams/state */ "./node_modules/readable-stream/lib/internal/streams/state.js"),
          getHighWaterMark = _require.getHighWaterMark;

        var _require$codes = (__webpack_require__(/*! ../errors */ "./node_modules/readable-stream/errors-browser.js").codes),
          ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
          ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
          ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
          ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
          ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
          ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
          ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
          ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;

        var errorOrDestroy = destroyImpl.errorOrDestroy;

        __webpack_require__(/*! inherits */ "./node_modules/inherits/inherits_browser.js")(Writable, Stream);

        function nop() { }

        function WritableState(options, stream, isDuplex) {
          Duplex = Duplex || __webpack_require__(/*! ./_stream_duplex */ "./node_modules/readable-stream/lib/_stream_duplex.js");
          options = options || {}; // Duplex streams are both readable and writable, but share
          // the same options object.
          // However, some cases require setting options to different
          // values for the readable and the writable sides of the duplex stream,
          // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.

          if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag to indicate whether or not this stream
          // contains buffers or objects.

          this.objectMode = !!options.objectMode;
          if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode; // the point at which write() starts returning false
          // Note: 0 is a valid value, means that we always return false if
          // the entire buffer is not flushed immediately on write()

          this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex); // if _final has been called

          this.finalCalled = false; // drain event flag.

          this.needDrain = false; // at the start of calling end()

          this.ending = false; // when end() has been called, and returned

          this.ended = false; // when 'finish' is emitted

          this.finished = false; // has it been destroyed

          this.destroyed = false; // should we decode strings into buffers before passing to _write?
          // this is here so that some node-core streams can optimize string
          // handling at a lower level.

          var noDecode = options.decodeStrings === false;
          this.decodeStrings = !noDecode; // Crypto is kind of old and crusty.  Historically, its default string
          // encoding is 'binary' so we have to make this configurable.
          // Everything else in the universe uses 'utf8', though.

          this.defaultEncoding = options.defaultEncoding || 'utf8'; // not an actual buffer we keep track of, but a measurement
          // of how much we're waiting to get pushed to some underlying
          // socket or file.

          this.length = 0; // a flag to see when we're in the middle of a write.

          this.writing = false; // when true all writes will be buffered until .uncork() call

          this.corked = 0; // a flag to be able to tell if the onwrite cb is called immediately,
          // or on a later tick.  We set this to true at first, because any
          // actions that shouldn't happen until "later" should generally also
          // not happen before the first write call.

          this.sync = true; // a flag to know if we're processing previously buffered items, which
          // may call the _write() callback in the same tick, so that we don't
          // end up in an overlapped onwrite situation.

          this.bufferProcessing = false; // the callback that's passed to _write(chunk,cb)

          this.onwrite = function (er) {
            onwrite(stream, er);
          }; // the callback that the user supplies to write(chunk,encoding,cb)


          this.writecb = null; // the amount that is being written when _write is called.

          this.writelen = 0;
          this.bufferedRequest = null;
          this.lastBufferedRequest = null; // number of pending user-supplied write callbacks
          // this must be 0 before 'finish' can be emitted

          this.pendingcb = 0; // emit prefinish if the only thing we're waiting for is _write cbs
          // This is relevant for synchronous Transform streams

          this.prefinished = false; // True if the error was already emitted and should not be thrown again

          this.errorEmitted = false; // Should close be emitted on destroy. Defaults to true.

          this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'finish' (and potentially 'end')

          this.autoDestroy = !!options.autoDestroy; // count buffered requests

          this.bufferedRequestCount = 0; // allocate the first CorkedRequest, there is always
          // one allocated and free to use, and we maintain at most two

          this.corkedRequestsFree = new CorkedRequest(this);
        }

        WritableState.prototype.getBuffer = function getBuffer() {
          var current = this.bufferedRequest;
          var out = [];

          while (current) {
            out.push(current);
            current = current.next;
          }

          return out;
        };

        (function () {
          try {
            Object.defineProperty(WritableState.prototype, 'buffer', {
              get: internalUtil.deprecate(function writableStateBufferGetter() {
                return this.getBuffer();
              }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
            });
          } catch (_) { }
        })(); // Test _writableState for inheritance to account for Duplex streams,
        // whose prototype chain only points to Readable.


        var realHasInstance;

        if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
          realHasInstance = Function.prototype[Symbol.hasInstance];
          Object.defineProperty(Writable, Symbol.hasInstance, {
            value: function value(object) {
              if (realHasInstance.call(this, object)) return true;
              if (this !== Writable) return false;
              return object && object._writableState instanceof WritableState;
            }
          });
        } else {
          realHasInstance = function realHasInstance(object) {
            return object instanceof this;
          };
        }

        function Writable(options) {
          Duplex = Duplex || __webpack_require__(/*! ./_stream_duplex */ "./node_modules/readable-stream/lib/_stream_duplex.js"); // Writable ctor is applied to Duplexes, too.
          // `realHasInstance` is necessary because using plain `instanceof`
          // would return false, as no `_writableState` property is attached.
          // Trying to use the custom `instanceof` for Writable here will also break the
          // Node.js LazyTransform implementation, which has a non-trivial getter for
          // `_writableState` that would lead to infinite recursion.
          // Checking for a Stream.Duplex instance is faster here instead of inside
          // the WritableState constructor, at least with V8 6.5

          var isDuplex = this instanceof Duplex;
          if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
          this._writableState = new WritableState(options, this, isDuplex); // legacy.

          this.writable = true;

          if (options) {
            if (typeof options.write === 'function') this._write = options.write;
            if (typeof options.writev === 'function') this._writev = options.writev;
            if (typeof options.destroy === 'function') this._destroy = options.destroy;
            if (typeof options.final === 'function') this._final = options.final;
          }

          Stream.call(this);
        } // Otherwise people can pipe Writable streams, which is just wrong.


        Writable.prototype.pipe = function () {
          errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
        };

        function writeAfterEnd(stream, cb) {
          var er = new ERR_STREAM_WRITE_AFTER_END(); // TODO: defer error events consistently everywhere, not just the cb

          errorOrDestroy(stream, er);
          process.nextTick(cb, er);
        } // Checks that a user-supplied chunk is valid, especially for the particular
        // mode the stream is in. Currently this means that `null` is never accepted
        // and undefined/non-string values are only allowed in object mode.


        function validChunk(stream, state, chunk, cb) {
          var er;

          if (chunk === null) {
            er = new ERR_STREAM_NULL_VALUES();
          } else if (typeof chunk !== 'string' && !state.objectMode) {
            er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
          }

          if (er) {
            errorOrDestroy(stream, er);
            process.nextTick(cb, er);
            return false;
          }

          return true;
        }

        Writable.prototype.write = function (chunk, encoding, cb) {
          var state = this._writableState;
          var ret = false;

          var isBuf = !state.objectMode && _isUint8Array(chunk);

          if (isBuf && !Buffer.isBuffer(chunk)) {
            chunk = _uint8ArrayToBuffer(chunk);
          }

          if (typeof encoding === 'function') {
            cb = encoding;
            encoding = null;
          }

          if (isBuf) encoding = 'buffer'; else if (!encoding) encoding = state.defaultEncoding;
          if (typeof cb !== 'function') cb = nop;
          if (state.ending) writeAfterEnd(this, cb); else if (isBuf || validChunk(this, state, chunk, cb)) {
            state.pendingcb++;
            ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
          }
          return ret;
        };

        Writable.prototype.cork = function () {
          this._writableState.corked++;
        };

        Writable.prototype.uncork = function () {
          var state = this._writableState;

          if (state.corked) {
            state.corked--;
            if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
          }
        };

        Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
          // node::ParseEncoding() requires lower case.
          if (typeof encoding === 'string') encoding = encoding.toLowerCase();
          if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
          this._writableState.defaultEncoding = encoding;
          return this;
        };

        Object.defineProperty(Writable.prototype, 'writableBuffer', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._writableState && this._writableState.getBuffer();
          }
        });

        function decodeChunk(state, chunk, encoding) {
          if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
            chunk = Buffer.from(chunk, encoding);
          }

          return chunk;
        }

        Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._writableState.highWaterMark;
          }
        }); // if we're already writing something, then just put this
        // in the queue, and wait our turn.  Otherwise, call _write
        // If we return false, then we need a drain event, so set that flag.

        function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
          if (!isBuf) {
            var newChunk = decodeChunk(state, chunk, encoding);

            if (chunk !== newChunk) {
              isBuf = true;
              encoding = 'buffer';
              chunk = newChunk;
            }
          }

          var len = state.objectMode ? 1 : chunk.length;
          state.length += len;
          var ret = state.length < state.highWaterMark; // we must ensure that previous needDrain will not be reset to false.

          if (!ret) state.needDrain = true;

          if (state.writing || state.corked) {
            var last = state.lastBufferedRequest;
            state.lastBufferedRequest = {
              chunk: chunk,
              encoding: encoding,
              isBuf: isBuf,
              callback: cb,
              next: null
            };

            if (last) {
              last.next = state.lastBufferedRequest;
            } else {
              state.bufferedRequest = state.lastBufferedRequest;
            }

            state.bufferedRequestCount += 1;
          } else {
            doWrite(stream, state, false, len, chunk, encoding, cb);
          }

          return ret;
        }

        function doWrite(stream, state, writev, len, chunk, encoding, cb) {
          state.writelen = len;
          state.writecb = cb;
          state.writing = true;
          state.sync = true;
          if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write')); else if (writev) stream._writev(chunk, state.onwrite); else stream._write(chunk, encoding, state.onwrite);
          state.sync = false;
        }

        function onwriteError(stream, state, sync, er, cb) {
          --state.pendingcb;

          if (sync) {
            // defer the callback if we are being called synchronously
            // to avoid piling up things on the stack
            process.nextTick(cb, er); // this can emit finish, and it will always happen
            // after error

            process.nextTick(finishMaybe, stream, state);
            stream._writableState.errorEmitted = true;
            errorOrDestroy(stream, er);
          } else {
            // the caller expect this to happen before if
            // it is async
            cb(er);
            stream._writableState.errorEmitted = true;
            errorOrDestroy(stream, er); // this can emit finish, but finish must
            // always follow error

            finishMaybe(stream, state);
          }
        }

        function onwriteStateUpdate(state) {
          state.writing = false;
          state.writecb = null;
          state.length -= state.writelen;
          state.writelen = 0;
        }

        function onwrite(stream, er) {
          var state = stream._writableState;
          var sync = state.sync;
          var cb = state.writecb;
          if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
          onwriteStateUpdate(state);
          if (er) onwriteError(stream, state, sync, er, cb); else {
            // Check if we're actually ready to finish, but don't emit yet
            var finished = needFinish(state) || stream.destroyed;

            if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
              clearBuffer(stream, state);
            }

            if (sync) {
              process.nextTick(afterWrite, stream, state, finished, cb);
            } else {
              afterWrite(stream, state, finished, cb);
            }
          }
        }

        function afterWrite(stream, state, finished, cb) {
          if (!finished) onwriteDrain(stream, state);
          state.pendingcb--;
          cb();
          finishMaybe(stream, state);
        } // Must force callback to be called on nextTick, so that we don't
        // emit 'drain' before the write() consumer gets the 'false' return
        // value, and has a chance to attach a 'drain' listener.


        function onwriteDrain(stream, state) {
          if (state.length === 0 && state.needDrain) {
            state.needDrain = false;
            stream.emit('drain');
          }
        } // if there's something in the buffer waiting, then process it


        function clearBuffer(stream, state) {
          state.bufferProcessing = true;
          var entry = state.bufferedRequest;

          if (stream._writev && entry && entry.next) {
            // Fast case, write everything using _writev()
            var l = state.bufferedRequestCount;
            var buffer = new Array(l);
            var holder = state.corkedRequestsFree;
            holder.entry = entry;
            var count = 0;
            var allBuffers = true;

            while (entry) {
              buffer[count] = entry;
              if (!entry.isBuf) allBuffers = false;
              entry = entry.next;
              count += 1;
            }

            buffer.allBuffers = allBuffers;
            doWrite(stream, state, true, state.length, buffer, '', holder.finish); // doWrite is almost always async, defer these to save a bit of time
            // as the hot path ends with doWrite

            state.pendingcb++;
            state.lastBufferedRequest = null;

            if (holder.next) {
              state.corkedRequestsFree = holder.next;
              holder.next = null;
            } else {
              state.corkedRequestsFree = new CorkedRequest(state);
            }

            state.bufferedRequestCount = 0;
          } else {
            // Slow case, write chunks one-by-one
            while (entry) {
              var chunk = entry.chunk;
              var encoding = entry.encoding;
              var cb = entry.callback;
              var len = state.objectMode ? 1 : chunk.length;
              doWrite(stream, state, false, len, chunk, encoding, cb);
              entry = entry.next;
              state.bufferedRequestCount--; // if we didn't call the onwrite immediately, then
              // it means that we need to wait until it does.
              // also, that means that the chunk and cb are currently
              // being processed, so move the buffer counter past them.

              if (state.writing) {
                break;
              }
            }

            if (entry === null) state.lastBufferedRequest = null;
          }

          state.bufferedRequest = entry;
          state.bufferProcessing = false;
        }

        Writable.prototype._write = function (chunk, encoding, cb) {
          cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
        };

        Writable.prototype._writev = null;

        Writable.prototype.end = function (chunk, encoding, cb) {
          var state = this._writableState;

          if (typeof chunk === 'function') {
            cb = chunk;
            chunk = null;
            encoding = null;
          } else if (typeof encoding === 'function') {
            cb = encoding;
            encoding = null;
          }

          if (chunk !== null && chunk !== undefined) this.write(chunk, encoding); // .end() fully uncorks

          if (state.corked) {
            state.corked = 1;
            this.uncork();
          } // ignore unnecessary end() calls.


          if (!state.ending) endWritable(this, state, cb);
          return this;
        };

        Object.defineProperty(Writable.prototype, 'writableLength', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            return this._writableState.length;
          }
        });

        function needFinish(state) {
          return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
        }

        function callFinal(stream, state) {
          stream._final(function (err) {
            state.pendingcb--;

            if (err) {
              errorOrDestroy(stream, err);
            }

            state.prefinished = true;
            stream.emit('prefinish');
            finishMaybe(stream, state);
          });
        }

        function prefinish(stream, state) {
          if (!state.prefinished && !state.finalCalled) {
            if (typeof stream._final === 'function' && !state.destroyed) {
              state.pendingcb++;
              state.finalCalled = true;
              process.nextTick(callFinal, stream, state);
            } else {
              state.prefinished = true;
              stream.emit('prefinish');
            }
          }
        }

        function finishMaybe(stream, state) {
          var need = needFinish(state);

          if (need) {
            prefinish(stream, state);

            if (state.pendingcb === 0) {
              state.finished = true;
              stream.emit('finish');

              if (state.autoDestroy) {
                // In case of duplex streams we need a way to detect
                // if the readable side is ready for autoDestroy as well
                var rState = stream._readableState;

                if (!rState || rState.autoDestroy && rState.endEmitted) {
                  stream.destroy();
                }
              }
            }
          }

          return need;
        }

        function endWritable(stream, state, cb) {
          state.ending = true;
          finishMaybe(stream, state);

          if (cb) {
            if (state.finished) process.nextTick(cb); else stream.once('finish', cb);
          }

          state.ended = true;
          stream.writable = false;
        }

        function onCorkedFinish(corkReq, state, err) {
          var entry = corkReq.entry;
          corkReq.entry = null;

          while (entry) {
            var cb = entry.callback;
            state.pendingcb--;
            cb(err);
            entry = entry.next;
          } // reuse the free corkReq.


          state.corkedRequestsFree.next = corkReq;
        }

        Object.defineProperty(Writable.prototype, 'destroyed', {
          // making it explicit this property is not enumerable
          // because otherwise some prototype manipulation in
          // userland will fail
          enumerable: false,
          get: function get() {
            if (this._writableState === undefined) {
              return false;
            }

            return this._writableState.destroyed;
          },
          set: function set(value) {
            // we ignore the value if the stream
            // has not been initialized yet
            if (!this._writableState) {
              return;
            } // backward compatibility, the user is explicitly
            // managing destroyed


            this._writableState.destroyed = value;
          }
        });
        Writable.prototype.destroy = destroyImpl.destroy;
        Writable.prototype._undestroy = destroyImpl.undestroy;

        Writable.prototype._destroy = function (err, cb) {
          cb(err);
        };

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/internal/streams/async_iterator.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/readable-stream/lib/internal/streams/async_iterator.js ***!
  \*****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
/* provided dependency */ var process = __webpack_require__(/*! process */ "./node_modules/process/browser.js");


        var _Object$setPrototypeO;

        function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

        var finished = __webpack_require__(/*! ./end-of-stream */ "./node_modules/readable-stream/lib/internal/streams/end-of-stream.js");

        var kLastResolve = Symbol('lastResolve');
        var kLastReject = Symbol('lastReject');
        var kError = Symbol('error');
        var kEnded = Symbol('ended');
        var kLastPromise = Symbol('lastPromise');
        var kHandlePromise = Symbol('handlePromise');
        var kStream = Symbol('stream');

        function createIterResult(value, done) {
          return {
            value: value,
            done: done
          };
        }

        function readAndResolve(iter) {
          var resolve = iter[kLastResolve];

          if (resolve !== null) {
            var data = iter[kStream].read(); // we defer if data is null
            // we can be expecting either 'end' or
            // 'error'

            if (data !== null) {
              iter[kLastPromise] = null;
              iter[kLastResolve] = null;
              iter[kLastReject] = null;
              resolve(createIterResult(data, false));
            }
          }
        }

        function onReadable(iter) {
          // we wait for the next tick, because it might
          // emit an error with process.nextTick
          process.nextTick(readAndResolve, iter);
        }

        function wrapForNext(lastPromise, iter) {
          return function (resolve, reject) {
            lastPromise.then(function () {
              if (iter[kEnded]) {
                resolve(createIterResult(undefined, true));
                return;
              }

              iter[kHandlePromise](resolve, reject);
            }, reject);
          };
        }

        var AsyncIteratorPrototype = Object.getPrototypeOf(function () { });
        var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
          get stream() {
            return this[kStream];
          },

          next: function next() {
            var _this = this;

            // if we have detected an error in the meanwhile
            // reject straight away
            var error = this[kError];

            if (error !== null) {
              return Promise.reject(error);
            }

            if (this[kEnded]) {
              return Promise.resolve(createIterResult(undefined, true));
            }

            if (this[kStream].destroyed) {
              // We need to defer via nextTick because if .destroy(err) is
              // called, the error will be emitted via nextTick, and
              // we cannot guarantee that there is no error lingering around
              // waiting to be emitted.
              return new Promise(function (resolve, reject) {
                process.nextTick(function () {
                  if (_this[kError]) {
                    reject(_this[kError]);
                  } else {
                    resolve(createIterResult(undefined, true));
                  }
                });
              });
            } // if we have multiple next() calls
            // we will wait for the previous Promise to finish
            // this logic is optimized to support for await loops,
            // where next() is only called once at a time


            var lastPromise = this[kLastPromise];
            var promise;

            if (lastPromise) {
              promise = new Promise(wrapForNext(lastPromise, this));
            } else {
              // fast path needed to support multiple this.push()
              // without triggering the next() queue
              var data = this[kStream].read();

              if (data !== null) {
                return Promise.resolve(createIterResult(data, false));
              }

              promise = new Promise(this[kHandlePromise]);
            }

            this[kLastPromise] = promise;
            return promise;
          }
        }, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
          return this;
        }), _defineProperty(_Object$setPrototypeO, "return", function _return() {
          var _this2 = this;

          // destroy(err, cb) is a private API
          // we can guarantee we have that here, because we control the
          // Readable class this is attached to
          return new Promise(function (resolve, reject) {
            _this2[kStream].destroy(null, function (err) {
              if (err) {
                reject(err);
                return;
              }

              resolve(createIterResult(undefined, true));
            });
          });
        }), _Object$setPrototypeO), AsyncIteratorPrototype);

        var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
          var _Object$create;

          var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
            value: stream,
            writable: true
          }), _defineProperty(_Object$create, kLastResolve, {
            value: null,
            writable: true
          }), _defineProperty(_Object$create, kLastReject, {
            value: null,
            writable: true
          }), _defineProperty(_Object$create, kError, {
            value: null,
            writable: true
          }), _defineProperty(_Object$create, kEnded, {
            value: stream._readableState.endEmitted,
            writable: true
          }), _defineProperty(_Object$create, kHandlePromise, {
            value: function value(resolve, reject) {
              var data = iterator[kStream].read();

              if (data) {
                iterator[kLastPromise] = null;
                iterator[kLastResolve] = null;
                iterator[kLastReject] = null;
                resolve(createIterResult(data, false));
              } else {
                iterator[kLastResolve] = resolve;
                iterator[kLastReject] = reject;
              }
            },
            writable: true
          }), _Object$create));
          iterator[kLastPromise] = null;
          finished(stream, function (err) {
            if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
              var reject = iterator[kLastReject]; // reject if we are waiting for data in the Promise
              // returned by next() and store the error

              if (reject !== null) {
                iterator[kLastPromise] = null;
                iterator[kLastResolve] = null;
                iterator[kLastReject] = null;
                reject(err);
              }

              iterator[kError] = err;
              return;
            }

            var resolve = iterator[kLastResolve];

            if (resolve !== null) {
              iterator[kLastPromise] = null;
              iterator[kLastResolve] = null;
              iterator[kLastReject] = null;
              resolve(createIterResult(undefined, true));
            }

            iterator[kEnded] = true;
          });
          stream.on('readable', onReadable.bind(null, iterator));
          return iterator;
        };

        module.exports = createReadableStreamAsyncIterator;

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/internal/streams/buffer_list.js":
/*!**************************************************************************!*\
  !*** ./node_modules/readable-stream/lib/internal/streams/buffer_list.js ***!
  \**************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";


        function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

        function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

        function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

        function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

        function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

        function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

        var _require = __webpack_require__(/*! buffer */ "./node_modules/buffer/index.js"),
          Buffer = _require.Buffer;

        var _require2 = __webpack_require__(/*! util */ "?ed1b"),
          inspect = _require2.inspect;

        var custom = inspect && inspect.custom || 'inspect';

        function copyBuffer(src, target, offset) {
          Buffer.prototype.copy.call(src, target, offset);
        }

        module.exports =
          /*#__PURE__*/
          function () {
            function BufferList() {
              _classCallCheck(this, BufferList);

              this.head = null;
              this.tail = null;
              this.length = 0;
            }

            _createClass(BufferList, [{
              key: "push",
              value: function push(v) {
                var entry = {
                  data: v,
                  next: null
                };
                if (this.length > 0) this.tail.next = entry; else this.head = entry;
                this.tail = entry;
                ++this.length;
              }
            }, {
              key: "unshift",
              value: function unshift(v) {
                var entry = {
                  data: v,
                  next: this.head
                };
                if (this.length === 0) this.tail = entry;
                this.head = entry;
                ++this.length;
              }
            }, {
              key: "shift",
              value: function shift() {
                if (this.length === 0) return;
                var ret = this.head.data;
                if (this.length === 1) this.head = this.tail = null; else this.head = this.head.next;
                --this.length;
                return ret;
              }
            }, {
              key: "clear",
              value: function clear() {
                this.head = this.tail = null;
                this.length = 0;
              }
            }, {
              key: "join",
              value: function join(s) {
                if (this.length === 0) return '';
                var p = this.head;
                var ret = '' + p.data;

                while (p = p.next) {
                  ret += s + p.data;
                }

                return ret;
              }
            }, {
              key: "concat",
              value: function concat(n) {
                if (this.length === 0) return Buffer.alloc(0);
                var ret = Buffer.allocUnsafe(n >>> 0);
                var p = this.head;
                var i = 0;

                while (p) {
                  copyBuffer(p.data, ret, i);
                  i += p.data.length;
                  p = p.next;
                }

                return ret;
              } // Consumes a specified amount of bytes or characters from the buffered data.

            }, {
              key: "consume",
              value: function consume(n, hasStrings) {
                var ret;

                if (n < this.head.data.length) {
                  // `slice` is the same for buffers and strings.
                  ret = this.head.data.slice(0, n);
                  this.head.data = this.head.data.slice(n);
                } else if (n === this.head.data.length) {
                  // First chunk is a perfect match.
                  ret = this.shift();
                } else {
                  // Result spans more than one buffer.
                  ret = hasStrings ? this._getString(n) : this._getBuffer(n);
                }

                return ret;
              }
            }, {
              key: "first",
              value: function first() {
                return this.head.data;
              } // Consumes a specified amount of characters from the buffered data.

            }, {
              key: "_getString",
              value: function _getString(n) {
                var p = this.head;
                var c = 1;
                var ret = p.data;
                n -= ret.length;

                while (p = p.next) {
                  var str = p.data;
                  var nb = n > str.length ? str.length : n;
                  if (nb === str.length) ret += str; else ret += str.slice(0, n);
                  n -= nb;

                  if (n === 0) {
                    if (nb === str.length) {
                      ++c;
                      if (p.next) this.head = p.next; else this.head = this.tail = null;
                    } else {
                      this.head = p;
                      p.data = str.slice(nb);
                    }

                    break;
                  }

                  ++c;
                }

                this.length -= c;
                return ret;
              } // Consumes a specified amount of bytes from the buffered data.

            }, {
              key: "_getBuffer",
              value: function _getBuffer(n) {
                var ret = Buffer.allocUnsafe(n);
                var p = this.head;
                var c = 1;
                p.data.copy(ret);
                n -= p.data.length;

                while (p = p.next) {
                  var buf = p.data;
                  var nb = n > buf.length ? buf.length : n;
                  buf.copy(ret, ret.length - n, 0, nb);
                  n -= nb;

                  if (n === 0) {
                    if (nb === buf.length) {
                      ++c;
                      if (p.next) this.head = p.next; else this.head = this.tail = null;
                    } else {
                      this.head = p;
                      p.data = buf.slice(nb);
                    }

                    break;
                  }

                  ++c;
                }

                this.length -= c;
                return ret;
              } // Make sure the linked list only shows the minimal necessary information.

            }, {
              key: custom,
              value: function value(_, options) {
                return inspect(this, _objectSpread({}, options, {
                  // Only inspect one level.
                  depth: 0,
                  // It should not recurse.
                  customInspect: false
                }));
              }
            }]);

            return BufferList;
          }();

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/internal/streams/destroy.js":
/*!**********************************************************************!*\
  !*** ./node_modules/readable-stream/lib/internal/streams/destroy.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
/* provided dependency */ var process = __webpack_require__(/*! process */ "./node_modules/process/browser.js");
        // undocumented cb() API, needed for core, not for public API

        function destroy(err, cb) {
          var _this = this;

          var readableDestroyed = this._readableState && this._readableState.destroyed;
          var writableDestroyed = this._writableState && this._writableState.destroyed;

          if (readableDestroyed || writableDestroyed) {
            if (cb) {
              cb(err);
            } else if (err) {
              if (!this._writableState) {
                process.nextTick(emitErrorNT, this, err);
              } else if (!this._writableState.errorEmitted) {
                this._writableState.errorEmitted = true;
                process.nextTick(emitErrorNT, this, err);
              }
            }

            return this;
          } // we set destroyed to true before firing error callbacks in order
          // to make it re-entrance safe in case destroy() is called within callbacks


          if (this._readableState) {
            this._readableState.destroyed = true;
          } // if this is a duplex stream mark the writable part as destroyed as well


          if (this._writableState) {
            this._writableState.destroyed = true;
          }

          this._destroy(err || null, function (err) {
            if (!cb && err) {
              if (!_this._writableState) {
                process.nextTick(emitErrorAndCloseNT, _this, err);
              } else if (!_this._writableState.errorEmitted) {
                _this._writableState.errorEmitted = true;
                process.nextTick(emitErrorAndCloseNT, _this, err);
              } else {
                process.nextTick(emitCloseNT, _this);
              }
            } else if (cb) {
              process.nextTick(emitCloseNT, _this);
              cb(err);
            } else {
              process.nextTick(emitCloseNT, _this);
            }
          });

          return this;
        }

        function emitErrorAndCloseNT(self, err) {
          emitErrorNT(self, err);
          emitCloseNT(self);
        }

        function emitCloseNT(self) {
          if (self._writableState && !self._writableState.emitClose) return;
          if (self._readableState && !self._readableState.emitClose) return;
          self.emit('close');
        }

        function undestroy() {
          if (this._readableState) {
            this._readableState.destroyed = false;
            this._readableState.reading = false;
            this._readableState.ended = false;
            this._readableState.endEmitted = false;
          }

          if (this._writableState) {
            this._writableState.destroyed = false;
            this._writableState.ended = false;
            this._writableState.ending = false;
            this._writableState.finalCalled = false;
            this._writableState.prefinished = false;
            this._writableState.finished = false;
            this._writableState.errorEmitted = false;
          }
        }

        function emitErrorNT(self, err) {
          self.emit('error', err);
        }

        function errorOrDestroy(stream, err) {
          // We have tests that rely on errors being emitted
          // in the same tick, so changing this is semver major.
          // For now when you opt-in to autoDestroy we allow
          // the error to be emitted nextTick. In a future
          // semver major update we should change the default to this.
          var rState = stream._readableState;
          var wState = stream._writableState;
          if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err); else stream.emit('error', err);
        }

        module.exports = {
          destroy: destroy,
          undestroy: undestroy,
          errorOrDestroy: errorOrDestroy
        };

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/internal/streams/end-of-stream.js":
/*!****************************************************************************!*\
  !*** ./node_modules/readable-stream/lib/internal/streams/end-of-stream.js ***!
  \****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
        // Ported from https://github.com/mafintosh/end-of-stream with
        // permission from the author, Mathias Buus (@mafintosh).


        var ERR_STREAM_PREMATURE_CLOSE = (__webpack_require__(/*! ../../../errors */ "./node_modules/readable-stream/errors-browser.js").codes.ERR_STREAM_PREMATURE_CLOSE);

        function once(callback) {
          var called = false;
          return function () {
            if (called) return;
            called = true;

            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            callback.apply(this, args);
          };
        }

        function noop() { }

        function isRequest(stream) {
          return stream.setHeader && typeof stream.abort === 'function';
        }

        function eos(stream, opts, callback) {
          if (typeof opts === 'function') return eos(stream, null, opts);
          if (!opts) opts = {};
          callback = once(callback || noop);
          var readable = opts.readable || opts.readable !== false && stream.readable;
          var writable = opts.writable || opts.writable !== false && stream.writable;

          var onlegacyfinish = function onlegacyfinish() {
            if (!stream.writable) onfinish();
          };

          var writableEnded = stream._writableState && stream._writableState.finished;

          var onfinish = function onfinish() {
            writable = false;
            writableEnded = true;
            if (!readable) callback.call(stream);
          };

          var readableEnded = stream._readableState && stream._readableState.endEmitted;

          var onend = function onend() {
            readable = false;
            readableEnded = true;
            if (!writable) callback.call(stream);
          };

          var onerror = function onerror(err) {
            callback.call(stream, err);
          };

          var onclose = function onclose() {
            var err;

            if (readable && !readableEnded) {
              if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
              return callback.call(stream, err);
            }

            if (writable && !writableEnded) {
              if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
              return callback.call(stream, err);
            }
          };

          var onrequest = function onrequest() {
            stream.req.on('finish', onfinish);
          };

          if (isRequest(stream)) {
            stream.on('complete', onfinish);
            stream.on('abort', onclose);
            if (stream.req) onrequest(); else stream.on('request', onrequest);
          } else if (writable && !stream._writableState) {
            // legacy streams
            stream.on('end', onlegacyfinish);
            stream.on('close', onlegacyfinish);
          }

          stream.on('end', onend);
          stream.on('finish', onfinish);
          if (opts.error !== false) stream.on('error', onerror);
          stream.on('close', onclose);
          return function () {
            stream.removeListener('complete', onfinish);
            stream.removeListener('abort', onclose);
            stream.removeListener('request', onrequest);
            if (stream.req) stream.req.removeListener('finish', onfinish);
            stream.removeListener('end', onlegacyfinish);
            stream.removeListener('close', onlegacyfinish);
            stream.removeListener('finish', onfinish);
            stream.removeListener('end', onend);
            stream.removeListener('error', onerror);
            stream.removeListener('close', onclose);
          };
        }

        module.exports = eos;

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/internal/streams/from-browser.js":
/*!***************************************************************************!*\
  !*** ./node_modules/readable-stream/lib/internal/streams/from-browser.js ***!
  \***************************************************************************/
/***/ ((module) => {

        module.exports = function () {
          throw new Error('Readable.from is not available in the browser')
        };


        /***/
      }),

/***/ "./node_modules/readable-stream/lib/internal/streams/pipeline.js":
/*!***********************************************************************!*\
  !*** ./node_modules/readable-stream/lib/internal/streams/pipeline.js ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";
        // Ported from https://github.com/mafintosh/pump with
        // permission from the author, Mathias Buus (@mafintosh).


        var eos;

        function once(callback) {
          var called = false;
          return function () {
            if (called) return;
            called = true;
            callback.apply(void 0, arguments);
          };
        }

        var _require$codes = (__webpack_require__(/*! ../../../errors */ "./node_modules/readable-stream/errors-browser.js").codes),
          ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
          ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;

        function noop(err) {
          // Rethrow the error if it exists to avoid swallowing it
          if (err) throw err;
        }

        function isRequest(stream) {
          return stream.setHeader && typeof stream.abort === 'function';
        }

        function destroyer(stream, reading, writing, callback) {
          callback = once(callback);
          var closed = false;
          stream.on('close', function () {
            closed = true;
          });
          if (eos === undefined) eos = __webpack_require__(/*! ./end-of-stream */ "./node_modules/readable-stream/lib/internal/streams/end-of-stream.js");
          eos(stream, {
            readable: reading,
            writable: writing
          }, function (err) {
            if (err) return callback(err);
            closed = true;
            callback();
          });
          var destroyed = false;
          return function (err) {
            if (closed) return;
            if (destroyed) return;
            destroyed = true; // request.destroy just do .end - .abort is what we want

            if (isRequest(stream)) return stream.abort();
            if (typeof stream.destroy === 'function') return stream.destroy();
            callback(err || new ERR_STREAM_DESTROYED('pipe'));
          };
        }

        function call(fn) {
          fn();
        }

        function pipe(from, to) {
          return from.pipe(to);
        }

        function popCallback(streams) {
          if (!streams.length) return noop;
          if (typeof streams[streams.length - 1] !== 'function') return noop;
          return streams.pop();
        }

        function pipeline() {
          for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
            streams[_key] = arguments[_key];
          }

          var callback = popCallback(streams);
          if (Array.isArray(streams[0])) streams = streams[0];

          if (streams.length < 2) {
            throw new ERR_MISSING_ARGS('streams');
          }

          var error;
          var destroys = streams.map(function (stream, i) {
            var reading = i < streams.length - 1;
            var writing = i > 0;
            return destroyer(stream, reading, writing, function (err) {
              if (!error) error = err;
              if (err) destroys.forEach(call);
              if (reading) return;
              destroys.forEach(call);
              callback(error);
            });
          });
          return streams.reduce(pipe);
        }

        module.exports = pipeline;

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/internal/streams/state.js":
/*!********************************************************************!*\
  !*** ./node_modules/readable-stream/lib/internal/streams/state.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        "use strict";


        var ERR_INVALID_OPT_VALUE = (__webpack_require__(/*! ../../../errors */ "./node_modules/readable-stream/errors-browser.js").codes.ERR_INVALID_OPT_VALUE);

        function highWaterMarkFrom(options, isDuplex, duplexKey) {
          return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
        }

        function getHighWaterMark(state, options, duplexKey, isDuplex) {
          var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);

          if (hwm != null) {
            if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
              var name = isDuplex ? duplexKey : 'highWaterMark';
              throw new ERR_INVALID_OPT_VALUE(name, hwm);
            }

            return Math.floor(hwm);
          } // Default value


          return state.objectMode ? 16 : 16 * 1024;
        }

        module.exports = {
          getHighWaterMark: getHighWaterMark
        };

        /***/
      }),

/***/ "./node_modules/readable-stream/lib/internal/streams/stream-browser.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/readable-stream/lib/internal/streams/stream-browser.js ***!
  \*****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        module.exports = __webpack_require__(/*! events */ "./node_modules/events/events.js").EventEmitter;


        /***/
      }),

/***/ "./node_modules/readable-web-to-node-stream/lib/index.js":
/*!***************************************************************!*\
  !*** ./node_modules/readable-web-to-node-stream/lib/index.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

        "use strict";

        Object.defineProperty(exports, "__esModule", ({ value: true }));
        const stream_1 = __webpack_require__(/*! stream */ "./node_modules/stream-browserify/index.js");
        /**
         * Converts a Web-API stream into Node stream.Readable class
         * Node stream readable: https://nodejs.org/api/stream.html#stream_readable_streams
         * Web API readable-stream: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
         * Node readable stream: https://nodejs.org/api/stream.html#stream_readable_streams
         */
        class ReadableWebToNodeStream extends stream_1.Readable {
          /**
           *
           * @param stream Readable​Stream: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
           */
          constructor(stream) {
            super();
            this.bytesRead = 0;
            this.released = false;
            this.reader = stream.getReader();
          }
          /**
           * Implementation of readable._read(size).
           * When readable._read() is called, if data is available from the resource,
           * the implementation should begin pushing that data into the read queue
           * https://nodejs.org/api/stream.html#stream_readable_read_size_1
           */
          async _read() {
            // Should start pushing data into the queue
            // Read data from the underlying Web-API-readable-stream
            if (this.released) {
              this.push(null); // Signal EOF
              return;
            }
            this.pendingRead = this.reader.read();
            const data = await this.pendingRead;
            // clear the promise before pushing pushing new data to the queue and allow sequential calls to _read()
            delete this.pendingRead;
            if (data.done || this.released) {
              this.push(null); // Signal EOF
            }
            else {
              this.bytesRead += data.value.length;
              this.push(data.value); // Push new data to the queue
            }
          }
          /**
           * If there is no unresolved read call to Web-API Readable​Stream immediately returns;
           * otherwise will wait until the read is resolved.
           */
          async waitForReadToComplete() {
            if (this.pendingRead) {
              await this.pendingRead;
            }
          }
          /**
           * Close wrapper
           */
          async close() {
            await this.syncAndRelease();
          }
          async syncAndRelease() {
            this.released = true;
            await this.waitForReadToComplete();
            await this.reader.releaseLock();
          }
        }
        exports.ReadableWebToNodeStream = ReadableWebToNodeStream;
        //# sourceMappingURL=index.js.map

        /***/
      }),

/***/ "./node_modules/safe-buffer/index.js":
/*!*******************************************!*\
  !*** ./node_modules/safe-buffer/index.js ***!
  \*******************************************/
/***/ ((module, exports, __webpack_require__) => {

        /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
        /* eslint-disable node/no-deprecated-api */
        var buffer = __webpack_require__(/*! buffer */ "./node_modules/buffer/index.js")
        var Buffer = buffer.Buffer

        // alternative to using Object.keys for old browsers
        function copyProps(src, dst) {
          for (var key in src) {
            dst[key] = src[key]
          }
        }
        if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
          module.exports = buffer
        } else {
          // Copy properties from require('buffer')
          copyProps(buffer, exports)
          exports.Buffer = SafeBuffer
        }

        function SafeBuffer(arg, encodingOrOffset, length) {
          return Buffer(arg, encodingOrOffset, length)
        }

        SafeBuffer.prototype = Object.create(Buffer.prototype)

        // Copy static methods from Buffer
        copyProps(Buffer, SafeBuffer)

        SafeBuffer.from = function (arg, encodingOrOffset, length) {
          if (typeof arg === 'number') {
            throw new TypeError('Argument must not be a number')
          }
          return Buffer(arg, encodingOrOffset, length)
        }

        SafeBuffer.alloc = function (size, fill, encoding) {
          if (typeof size !== 'number') {
            throw new TypeError('Argument must be a number')
          }
          var buf = Buffer(size)
          if (fill !== undefined) {
            if (typeof encoding === 'string') {
              buf.fill(fill, encoding)
            } else {
              buf.fill(fill)
            }
          } else {
            buf.fill(0)
          }
          return buf
        }

        SafeBuffer.allocUnsafe = function (size) {
          if (typeof size !== 'number') {
            throw new TypeError('Argument must be a number')
          }
          return Buffer(size)
        }

        SafeBuffer.allocUnsafeSlow = function (size) {
          if (typeof size !== 'number') {
            throw new TypeError('Argument must be a number')
          }
          return buffer.SlowBuffer(size)
        }


        /***/
      }),

/***/ "./node_modules/stk500/index.js":
/*!**************************************!*\
  !*** ./node_modules/stk500/index.js ***!
  \**************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(/*! buffer */ "./node_modules/buffer/index.js")["Buffer"];
        var async = __webpack_require__(/*! async */ "./node_modules/stk500/node_modules/async/lib/async.js");
        var Statics = __webpack_require__(/*! ./lib/statics */ "./node_modules/stk500/lib/statics.js");
        var sendCommand = __webpack_require__(/*! ./lib/sendCommand */ "./node_modules/stk500/lib/sendCommand.js");

        var stk500 = function (opts) {
          this.opts = opts || {};
          this.quiet = this.opts.quiet || false;
          if (this.quiet) {
            this.log = function () { };
          } else {
            if (typeof window === 'object') {
              this.log = console.log.bind(window);
            } else {
              this.log = console.log;
            }
          }
        }

        stk500.prototype.sync = function (stream, attempts, timeout, done) {
          this.log("sync");
          var self = this;
          var tries = 1;

          var opt = {
            cmd: [
              Statics.Cmnd_STK_GET_SYNC
            ],
            responseData: Statics.OK_RESPONSE,
            timeout: timeout
          };
          function attempt() {
            tries = tries + 1;
            sendCommand(stream, opt, function (err, data) {
              if (err && tries <= attempts) {
                if (err) {
                  self.log(err);
                }
                self.log("failed attempt again", tries);
                return attempt();
              }
              self.log('sync complete', err, data, tries);
              done(err, data);
            });
          }
          attempt();
        };

        stk500.prototype.verifySignature = function (stream, signature, timeout, done) {
          this.log("verify signature");
          var self = this;
          match = Buffer.concat([
            Buffer.from([Statics.Resp_STK_INSYNC]),
            signature,
            Buffer.from([Statics.Resp_STK_OK])
          ]);

          var opt = {
            cmd: [
              Statics.Cmnd_STK_READ_SIGN
            ],
            responseLength: match.length,
            timeout: timeout
          };
          sendCommand(stream, opt, function (err, data) {
            if (data) {
              self.log('confirm signature', err, data, data.toString('hex'));
            } else {
              self.log('confirm signature', err, 'no data');
            }
            done(err, data);
          });
        };

        stk500.prototype.getSignature = function (stream, timeout, done) {
          this.log("get signature");
          var opt = {
            cmd: [
              Statics.Cmnd_STK_READ_SIGN
            ],
            responseLength: 5,
            timeout: timeout
          };
          sendCommand(stream, opt, function (err, data) {
            this.log('getSignature', err, data);
            done(err, data);
          });
        };

        stk500.prototype.setOptions = function (stream, options, timeout, done) {
          this.log("set device");
          var self = this;

          var opt = {
            cmd: [
              Statics.Cmnd_STK_SET_DEVICE,
              options.devicecode || 0,
              options.revision || 0,
              options.progtype || 0,
              options.parmode || 0,
              options.polling || 0,
              options.selftimed || 0,
              options.lockbytes || 0,
              options.fusebytes || 0,
              options.flashpollval1 || 0,
              options.flashpollval2 || 0,
              options.eeprompollval1 || 0,
              options.eeprompollval2 || 0,
              options.pagesizehigh || 0,
              options.pagesizelow || 0,
              options.eepromsizehigh || 0,
              options.eepromsizelow || 0,
              options.flashsize4 || 0,
              options.flashsize3 || 0,
              options.flashsize2 || 0,
              options.flashsize1 || 0
            ],
            responseData: Statics.OK_RESPONSE,
            timeout: timeout
          };
          sendCommand(stream, opt, function (err, data) {
            self.log('setOptions', err, data);
            if (err) {
              return done(err);
            }
            done();
          });
        };

        stk500.prototype.enterProgrammingMode = function (stream, timeout, done) {
          this.log("send enter programming mode");
          var self = this;
          var opt = {
            cmd: [
              Statics.Cmnd_STK_ENTER_PROGMODE
            ],
            responseData: Statics.OK_RESPONSE,
            timeout: timeout
          };
          sendCommand(stream, opt, function (err, data) {
            self.log("sent enter programming mode", err, data);
            done(err, data);
          });
        };

        stk500.prototype.loadAddress = function (stream, useaddr, timeout, done) {
          this.log("load address");
          var self = this;
          var addr_low = useaddr & 0xff;
          var addr_high = (useaddr >> 8) & 0xff;
          var opt = {
            cmd: [
              Statics.Cmnd_STK_LOAD_ADDRESS,
              addr_low,
              addr_high
            ],
            responseData: Statics.OK_RESPONSE,
            timeout: timeout
          };
          sendCommand(stream, opt, function (err, data) {
            self.log('loaded address', err, data);
            done(err, data);
          });
        };

        stk500.prototype.loadPage = function (stream, writeBytes, timeout, done) {
          this.log("load page");
          var self = this;
          var bytes_low = writeBytes.length & 0xff;
          var bytes_high = writeBytes.length >> 8;

          var cmd = Buffer.concat([
            Buffer.from([Statics.Cmnd_STK_PROG_PAGE, bytes_high, bytes_low, 0x46]),
            writeBytes,
            Buffer.from([Statics.Sync_CRC_EOP])
          ]);

          var opt = {
            cmd: cmd,
            responseData: Statics.OK_RESPONSE,
            timeout: timeout
          };
          sendCommand(stream, opt, function (err, data) {
            self.log('loaded page', err, data);
            done(err, data);
          });
        };

        stk500.prototype.upload = function (stream, hex, pageSize, timeout, use_8_bit_addresseses, done) {
          this.log("program");

          var pageaddr = 0;
          var writeBytes;
          var useaddr;

          var self = this;

          // program individual pages
          async.whilst(
            function () { return pageaddr < hex.length; },
            function (pagedone) {
              self.log("program page");
              async.series([
                function (cbdone) {
                  useaddr = use_8_bit_addresseses ? pageaddr : pageaddr >> 1;
                  cbdone();
                },
                function (cbdone) {
                  self.loadAddress(stream, useaddr, timeout, cbdone);
                },
                function (cbdone) {

                  writeBytes = hex.slice(pageaddr, (hex.length > pageSize ? (pageaddr + pageSize) : hex.length - 1))
                  cbdone();
                },
                function (cbdone) {
                  self.loadPage(stream, writeBytes, timeout, cbdone);
                },
                function (cbdone) {
                  self.log("programmed page");
                  pageaddr = pageaddr + writeBytes.length;
                  setTimeout(cbdone, 4);
                }
              ],
                function (error) {
                  self.log("page done");
                  pagedone(error);
                });
            },
            function (error) {
              self.log("upload done");
              done(error);
            }
          );
        };

        stk500.prototype.exitProgrammingMode = function (stream, timeout, done) {
          this.log("send leave programming mode");
          var self = this;
          var opt = {
            cmd: [
              Statics.Cmnd_STK_LEAVE_PROGMODE
            ],
            responseData: Statics.OK_RESPONSE,
            timeout: timeout
          };
          sendCommand(stream, opt, function (err, data) {
            self.log('sent leave programming mode', err, data);
            done(err, data);
          });
        };

        stk500.prototype.verify = function (stream, hex, pageSize, timeout, use_8_bit_addresseses, done) {
          this.log("verify");

          var pageaddr = 0;
          var writeBytes;
          var useaddr;

          var self = this;

          // verify individual pages
          async.whilst(
            function () { return pageaddr < hex.length; },
            function (pagedone) {
              self.log("verify page");
              async.series([
                function (cbdone) {
                  useaddr = use_8_bit_addresseses ? pageaddr : pageaddr >> 1;
                  cbdone();
                },
                function (cbdone) {
                  self.loadAddress(stream, useaddr, timeout, cbdone);
                },
                function (cbdone) {

                  writeBytes = hex.slice(pageaddr, (hex.length > pageSize ? (pageaddr + pageSize) : hex.length - 1))
                  cbdone();
                },
                function (cbdone) {
                  self.verifyPage(stream, writeBytes, pageSize, timeout, cbdone);
                },
                function (cbdone) {
                  self.log("verified page");
                  pageaddr = pageaddr + writeBytes.length;
                  setTimeout(cbdone, 4);
                }
              ],
                function (error) {
                  self.log("verify done");
                  pagedone(error);
                });
            },
            function (error) {
              self.log("verify done");
              done(error);
            }
          );
        };

        stk500.prototype.verifyPage = function (stream, writeBytes, pageSize, timeout, done) {
          this.log("verify page");
          var self = this;
          match = Buffer.concat([
            Buffer.from([Statics.Resp_STK_INSYNC]),
            writeBytes,
            Buffer.from([Statics.Resp_STK_OK])
          ]);

          var size = writeBytes.length >= pageSize ? pageSize : writeBytes.length;

          var opt = {
            cmd: [
              Statics.Cmnd_STK_READ_PAGE,
              (size >> 8) & 0xff,
              size & 0xff,
              0x46
            ],
            responseLength: match.length,
            timeout: timeout
          };
          sendCommand(stream, opt, function (err, data) {
            self.log('confirm page', err, data, data.toString('hex'));
            done(err, data);
          });
        };

        stk500.prototype.bootload = function (stream, hex, opt, use_8_bit_addresseses, done) {

          var parameters = {
            pagesizehigh: (opt.pagesizehigh << 8 & 0xff),
            pagesizelow: opt.pagesizelow & 0xff
          }

          async.series([
            // send two dummy syncs like avrdude does
            this.sync.bind(this, stream, 3, opt.timeout),
            this.sync.bind(this, stream, 3, opt.timeout),
            this.sync.bind(this, stream, 3, opt.timeout),
            this.verifySignature.bind(this, stream, opt.signature, opt.timeout),
            this.setOptions.bind(this, stream, parameters, opt.timeout),
            this.enterProgrammingMode.bind(this, stream, opt.timeout),
            this.upload.bind(this, stream, hex, opt.pageSize, opt.timeout, use_8_bit_addresseses),
            this.verify.bind(this, stream, hex, opt.pageSize, opt.timeout, use_8_bit_addresseses),
            this.exitProgrammingMode.bind(this, stream, opt.timeout)
          ], function (error) {
            return done(error);
          });
        };

        module.exports = stk500;


        /***/
      }),

/***/ "./node_modules/stk500/lib/receiveData.js":
/*!************************************************!*\
  !*** ./node_modules/stk500/lib/receiveData.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(/*! buffer */ "./node_modules/buffer/index.js")["Buffer"];
        var Statics = __webpack_require__(/*! ./statics */ "./node_modules/stk500/lib/statics.js");

        var startingBytes = [
          Statics.Resp_STK_INSYNC
        ];

        module.exports = function (stream, timeout, responseLength, callback) {
          var buffer = Buffer.alloc(0);
          var started = false;
          var timeoutId = null;
          var handleChunk = function (data) {
            var index = 0;
            while (!started && index < data.length) {
              var byte = data[index];
              if (startingBytes.indexOf(byte) !== -1) {
                data = data.slice(index, data.length - index);
                started = true;
              }
              index++;
            }
            if (started) {
              buffer = Buffer.concat([buffer, data]);
            }
            if (buffer.length > responseLength) {
              // or ignore after
              return finished(new Error('buffer overflow ' + buffer.length + ' > ' + responseLength));
            }
            if (buffer.length == responseLength) {
              finished();
            }
          };
          var finished = function (err) {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            // VALIDATE TERMINAL BYTE?
            stream.removeListener('data', handleChunk);
            callback(err, buffer);
          };
          if (timeout && timeout > 0) {
            timeoutId = setTimeout(function () {
              timeoutId = null;
              finished(new Error('receiveData timeout after ' + timeout + 'ms'));
            }, timeout);
          }
          stream.on('data', handleChunk);
        };


        /***/
      }),

/***/ "./node_modules/stk500/lib/sendCommand.js":
/*!************************************************!*\
  !*** ./node_modules/stk500/lib/sendCommand.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(/*! buffer */ "./node_modules/buffer/index.js")["Buffer"];
        var receiveData = __webpack_require__(/*! ./receiveData */ "./node_modules/stk500/lib/receiveData.js");
        var Statics = __webpack_require__(/*! ./statics */ "./node_modules/stk500/lib/statics.js");

        module.exports = function (stream, opt, callback) {
          var timeout = opt.timeout || 0;
          var startingBytes = [
            Statics.Resp_STK_INSYNC,
            Statics.Resp_STK_NOSYNC
          ];
          var responseData = null;
          var responseLength = 0;
          var error;

          if (opt.responseData && opt.responseData.length > 0) {
            responseData = opt.responseData;
          }
          if (responseData) {
            responseLength = responseData.length;
          }
          if (opt.responseLength) {
            responseLength = opt.responseLength;
          }
          var cmd = opt.cmd;
          if (cmd instanceof Array) {
            cmd = Buffer.from(cmd.concat(Statics.Sync_CRC_EOP));
          }

          stream.write(cmd, function (err) {
            if (err) {
              error = new Error('Sending ' + cmd.toString('hex') + ': ' + err.message);
              return callback(error);
            }
            receiveData(stream, timeout, responseLength, function (err, data) {
              if (err) {
                error = new Error('Sending ' + cmd.toString('hex') + ': ' + err.message);
                return callback(error);
              }

              if (responseData && !data.equals(responseData)) {
                error = new Error(cmd + ' response mismatch: ' + data.toString('hex') + ', ' + responseData.toString('hex'));
                return callback(error);
              }
              callback(null, data);
            });
          });
        };


        /***/
      }),

/***/ "./node_modules/stk500/lib/statics.js":
/*!********************************************!*\
  !*** ./node_modules/stk500/lib/statics.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* provided dependency */ var Buffer = __webpack_require__(/*! buffer */ "./node_modules/buffer/index.js")["Buffer"];
        var Resp_STK_INSYNC = 0x14;
        var Resp_STK_OK = 0x10;

        module.exports = {
          Cmnd_STK_GET_SYNC: 0x30,
          Cmnd_STK_SET_DEVICE: 0x42,
          Cmnd_STK_ENTER_PROGMODE: 0x50,
          Cmnd_STK_LOAD_ADDRESS: 0x55,
          Cmnd_STK_PROG_PAGE: 0x64,
          Cmnd_STK_LEAVE_PROGMODE: 0x51,
          Cmnd_STK_READ_SIGN: 0x75,

          Sync_CRC_EOP: 0x20,

          Resp_STK_OK: 0x10,
          Resp_STK_INSYNC: 0x14,
          Resp_STK_NOSYNC: 0x15,


          Cmnd_STK_READ_PAGE: 0x74,


          OK_RESPONSE: Buffer.from([Resp_STK_INSYNC, Resp_STK_OK])
        };


        /***/
      }),

/***/ "./node_modules/stk500/node_modules/async/lib/async.js":
/*!*************************************************************!*\
  !*** ./node_modules/stk500/node_modules/async/lib/async.js ***!
  \*************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(/*! process */ "./node_modules/process/browser.js");
        var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
        /*jshint onevar: false, indent:4 */
        /*global setImmediate: false, setTimeout: false, console: false */
        (function () {

          var async = {};

          // global on the server, window in the browser
          var root, previous_async;

          root = this;
          if (root != null) {
            previous_async = root.async;
          }

          async.noConflict = function () {
            root.async = previous_async;
            return async;
          };

          function only_once(fn) {
            var called = false;
            return function () {
              if (called) throw new Error("Callback was already called.");
              called = true;
              fn.apply(root, arguments);
            }
          }

          //// cross-browser compatiblity functions ////

          var _toString = Object.prototype.toString;

          var _isArray = Array.isArray || function (obj) {
            return _toString.call(obj) === '[object Array]';
          };

          var _each = function (arr, iterator) {
            for (var i = 0; i < arr.length; i += 1) {
              iterator(arr[i], i, arr);
            }
          };

          var _map = function (arr, iterator) {
            if (arr.map) {
              return arr.map(iterator);
            }
            var results = [];
            _each(arr, function (x, i, a) {
              results.push(iterator(x, i, a));
            });
            return results;
          };

          var _reduce = function (arr, iterator, memo) {
            if (arr.reduce) {
              return arr.reduce(iterator, memo);
            }
            _each(arr, function (x, i, a) {
              memo = iterator(memo, x, i, a);
            });
            return memo;
          };

          var _keys = function (obj) {
            if (Object.keys) {
              return Object.keys(obj);
            }
            var keys = [];
            for (var k in obj) {
              if (obj.hasOwnProperty(k)) {
                keys.push(k);
              }
            }
            return keys;
          };

          //// exported async module functions ////

          //// nextTick implementation with browser-compatible fallback ////
          if (typeof process === 'undefined' || !(process.nextTick)) {
            if (typeof setImmediate === 'function') {
              async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
              };
              async.setImmediate = async.nextTick;
            }
            else {
              async.nextTick = function (fn) {
                setTimeout(fn, 0);
              };
              async.setImmediate = async.nextTick;
            }
          }
          else {
            async.nextTick = process.nextTick;
            if (typeof setImmediate !== 'undefined') {
              async.setImmediate = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
              };
            }
            else {
              async.setImmediate = async.nextTick;
            }
          }

          async.each = function (arr, iterator, callback) {
            callback = callback || function () { };
            if (!arr.length) {
              return callback();
            }
            var completed = 0;
            _each(arr, function (x) {
              iterator(x, only_once(done));
            });
            function done(err) {
              if (err) {
                callback(err);
                callback = function () { };
              }
              else {
                completed += 1;
                if (completed >= arr.length) {
                  callback();
                }
              }
            }
          };
          async.forEach = async.each;

          async.eachSeries = function (arr, iterator, callback) {
            callback = callback || function () { };
            if (!arr.length) {
              return callback();
            }
            var completed = 0;
            var iterate = function () {
              iterator(arr[completed], function (err) {
                if (err) {
                  callback(err);
                  callback = function () { };
                }
                else {
                  completed += 1;
                  if (completed >= arr.length) {
                    callback();
                  }
                  else {
                    iterate();
                  }
                }
              });
            };
            iterate();
          };
          async.forEachSeries = async.eachSeries;

          async.eachLimit = function (arr, limit, iterator, callback) {
            var fn = _eachLimit(limit);
            fn.apply(null, [arr, iterator, callback]);
          };
          async.forEachLimit = async.eachLimit;

          var _eachLimit = function (limit) {

            return function (arr, iterator, callback) {
              callback = callback || function () { };
              if (!arr.length || limit <= 0) {
                return callback();
              }
              var completed = 0;
              var started = 0;
              var running = 0;

              (function replenish() {
                if (completed >= arr.length) {
                  return callback();
                }

                while (running < limit && started < arr.length) {
                  started += 1;
                  running += 1;
                  iterator(arr[started - 1], function (err) {
                    if (err) {
                      callback(err);
                      callback = function () { };
                    }
                    else {
                      completed += 1;
                      running -= 1;
                      if (completed >= arr.length) {
                        callback();
                      }
                      else {
                        replenish();
                      }
                    }
                  });
                }
              })();
            };
          };


          var doParallel = function (fn) {
            return function () {
              var args = Array.prototype.slice.call(arguments);
              return fn.apply(null, [async.each].concat(args));
            };
          };
          var doParallelLimit = function (limit, fn) {
            return function () {
              var args = Array.prototype.slice.call(arguments);
              return fn.apply(null, [_eachLimit(limit)].concat(args));
            };
          };
          var doSeries = function (fn) {
            return function () {
              var args = Array.prototype.slice.call(arguments);
              return fn.apply(null, [async.eachSeries].concat(args));
            };
          };


          var _asyncMap = function (eachfn, arr, iterator, callback) {
            arr = _map(arr, function (x, i) {
              return { index: i, value: x };
            });
            if (!callback) {
              eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                  callback(err);
                });
              });
            } else {
              var results = [];
              eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                  results[x.index] = v;
                  callback(err);
                });
              }, function (err) {
                callback(err, results);
              });
            }
          };
          async.map = doParallel(_asyncMap);
          async.mapSeries = doSeries(_asyncMap);
          async.mapLimit = function (arr, limit, iterator, callback) {
            return _mapLimit(limit)(arr, iterator, callback);
          };

          var _mapLimit = function (limit) {
            return doParallelLimit(limit, _asyncMap);
          };

          // reduce only has a series version, as doing reduce in parallel won't
          // work in many situations.
          async.reduce = function (arr, memo, iterator, callback) {
            async.eachSeries(arr, function (x, callback) {
              iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
              });
            }, function (err) {
              callback(err, memo);
            });
          };
          // inject alias
          async.inject = async.reduce;
          // foldl alias
          async.foldl = async.reduce;

          async.reduceRight = function (arr, memo, iterator, callback) {
            var reversed = _map(arr, function (x) {
              return x;
            }).reverse();
            async.reduce(reversed, memo, iterator, callback);
          };
          // foldr alias
          async.foldr = async.reduceRight;

          var _filter = function (eachfn, arr, iterator, callback) {
            var results = [];
            arr = _map(arr, function (x, i) {
              return { index: i, value: x };
            });
            eachfn(arr, function (x, callback) {
              iterator(x.value, function (v) {
                if (v) {
                  results.push(x);
                }
                callback();
              });
            }, function (err) {
              callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
              }), function (x) {
                return x.value;
              }));
            });
          };
          async.filter = doParallel(_filter);
          async.filterSeries = doSeries(_filter);
          // select alias
          async.select = async.filter;
          async.selectSeries = async.filterSeries;

          var _reject = function (eachfn, arr, iterator, callback) {
            var results = [];
            arr = _map(arr, function (x, i) {
              return { index: i, value: x };
            });
            eachfn(arr, function (x, callback) {
              iterator(x.value, function (v) {
                if (!v) {
                  results.push(x);
                }
                callback();
              });
            }, function (err) {
              callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
              }), function (x) {
                return x.value;
              }));
            });
          };
          async.reject = doParallel(_reject);
          async.rejectSeries = doSeries(_reject);

          var _detect = function (eachfn, arr, iterator, main_callback) {
            eachfn(arr, function (x, callback) {
              iterator(x, function (result) {
                if (result) {
                  main_callback(x);
                  main_callback = function () { };
                }
                else {
                  callback();
                }
              });
            }, function (err) {
              main_callback();
            });
          };
          async.detect = doParallel(_detect);
          async.detectSeries = doSeries(_detect);

          async.some = function (arr, iterator, main_callback) {
            async.each(arr, function (x, callback) {
              iterator(x, function (v) {
                if (v) {
                  main_callback(true);
                  main_callback = function () { };
                }
                callback();
              });
            }, function (err) {
              main_callback(false);
            });
          };
          // any alias
          async.any = async.some;

          async.every = function (arr, iterator, main_callback) {
            async.each(arr, function (x, callback) {
              iterator(x, function (v) {
                if (!v) {
                  main_callback(false);
                  main_callback = function () { };
                }
                callback();
              });
            }, function (err) {
              main_callback(true);
            });
          };
          // all alias
          async.all = async.every;

          async.sortBy = function (arr, iterator, callback) {
            async.map(arr, function (x, callback) {
              iterator(x, function (err, criteria) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, { value: x, criteria: criteria });
                }
              });
            }, function (err, results) {
              if (err) {
                return callback(err);
              }
              else {
                var fn = function (left, right) {
                  var a = left.criteria, b = right.criteria;
                  return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                  return x.value;
                }));
              }
            });
          };

          async.auto = function (tasks, callback) {
            callback = callback || function () { };
            var keys = _keys(tasks);
            var remainingTasks = keys.length
            if (!remainingTasks) {
              return callback();
            }

            var results = {};

            var listeners = [];
            var addListener = function (fn) {
              listeners.unshift(fn);
            };
            var removeListener = function (fn) {
              for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                  listeners.splice(i, 1);
                  return;
                }
              }
            };
            var taskComplete = function () {
              remainingTasks--
              _each(listeners.slice(0), function (fn) {
                fn();
              });
            };

            addListener(function () {
              if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () { };

                theCallback(null, results);
              }
            });

            _each(keys, function (k) {
              var task = _isArray(tasks[k]) ? tasks[k] : [tasks[k]];
              var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                  args = args[0];
                }
                if (err) {
                  var safeResults = {};
                  _each(_keys(results), function (rkey) {
                    safeResults[rkey] = results[rkey];
                  });
                  safeResults[k] = args;
                  callback(err, safeResults);
                  // stop subsequent errors hitting callback multiple times
                  callback = function () { };
                }
                else {
                  results[k] = args;
                  async.setImmediate(taskComplete);
                }
              };
              var requires = task.slice(0, Math.abs(task.length - 1)) || [];
              var ready = function () {
                return _reduce(requires, function (a, x) {
                  return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
              };
              if (ready()) {
                task[task.length - 1](taskCallback, results);
              }
              else {
                var listener = function () {
                  if (ready()) {
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                  }
                };
                addListener(listener);
              }
            });
          };

          async.retry = function (times, task, callback) {
            var DEFAULT_TIMES = 5;
            var attempts = [];
            // Use defaults if times not passed
            if (typeof times === 'function') {
              callback = task;
              task = times;
              times = DEFAULT_TIMES;
            }
            // Make sure times is a number
            times = parseInt(times, 10) || DEFAULT_TIMES;
            var wrappedTask = function (wrappedCallback, wrappedResults) {
              var retryAttempt = function (task, finalAttempt) {
                return function (seriesCallback) {
                  task(function (err, result) {
                    seriesCallback(!err || finalAttempt, { err: err, result: result });
                  }, wrappedResults);
                };
              };
              while (times) {
                attempts.push(retryAttempt(task, !(times -= 1)));
              }
              async.series(attempts, function (done, data) {
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
              });
            }
            // If a callback is passed, run this as a controll flow
            return callback ? wrappedTask() : wrappedTask
          };

          async.waterfall = function (tasks, callback) {
            callback = callback || function () { };
            if (!_isArray(tasks)) {
              var err = new Error('First argument to waterfall must be an array of functions');
              return callback(err);
            }
            if (!tasks.length) {
              return callback();
            }
            var wrapIterator = function (iterator) {
              return function (err) {
                if (err) {
                  callback.apply(null, arguments);
                  callback = function () { };
                }
                else {
                  var args = Array.prototype.slice.call(arguments, 1);
                  var next = iterator.next();
                  if (next) {
                    args.push(wrapIterator(next));
                  }
                  else {
                    args.push(callback);
                  }
                  async.setImmediate(function () {
                    iterator.apply(null, args);
                  });
                }
              };
            };
            wrapIterator(async.iterator(tasks))();
          };

          var _parallel = function (eachfn, tasks, callback) {
            callback = callback || function () { };
            if (_isArray(tasks)) {
              eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                  fn(function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                      args = args[0];
                    }
                    callback.call(null, err, args);
                  });
                }
              }, callback);
            }
            else {
              var results = {};
              eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                  var args = Array.prototype.slice.call(arguments, 1);
                  if (args.length <= 1) {
                    args = args[0];
                  }
                  results[k] = args;
                  callback(err);
                });
              }, function (err) {
                callback(err, results);
              });
            }
          };

          async.parallel = function (tasks, callback) {
            _parallel({ map: async.map, each: async.each }, tasks, callback);
          };

          async.parallelLimit = function (tasks, limit, callback) {
            _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
          };

          async.series = function (tasks, callback) {
            callback = callback || function () { };
            if (_isArray(tasks)) {
              async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                  fn(function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                      args = args[0];
                    }
                    callback.call(null, err, args);
                  });
                }
              }, callback);
            }
            else {
              var results = {};
              async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                  var args = Array.prototype.slice.call(arguments, 1);
                  if (args.length <= 1) {
                    args = args[0];
                  }
                  results[k] = args;
                  callback(err);
                });
              }, function (err) {
                callback(err, results);
              });
            }
          };

          async.iterator = function (tasks) {
            var makeCallback = function (index) {
              var fn = function () {
                if (tasks.length) {
                  tasks[index].apply(null, arguments);
                }
                return fn.next();
              };
              fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1) : null;
              };
              return fn;
            };
            return makeCallback(0);
          };

          async.apply = function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            return function () {
              return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
              );
            };
          };

          var _concat = function (eachfn, arr, fn, callback) {
            var r = [];
            eachfn(arr, function (x, cb) {
              fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
              });
            }, function (err) {
              callback(err, r);
            });
          };
          async.concat = doParallel(_concat);
          async.concatSeries = doSeries(_concat);

          async.whilst = function (test, iterator, callback) {
            if (test()) {
              iterator(function (err) {
                if (err) {
                  return callback(err);
                }
                async.whilst(test, iterator, callback);
              });
            }
            else {
              callback();
            }
          };

          async.doWhilst = function (iterator, test, callback) {
            iterator(function (err) {
              if (err) {
                return callback(err);
              }
              var args = Array.prototype.slice.call(arguments, 1);
              if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
              }
              else {
                callback();
              }
            });
          };

          async.until = function (test, iterator, callback) {
            if (!test()) {
              iterator(function (err) {
                if (err) {
                  return callback(err);
                }
                async.until(test, iterator, callback);
              });
            }
            else {
              callback();
            }
          };

          async.doUntil = function (iterator, test, callback) {
            iterator(function (err) {
              if (err) {
                return callback(err);
              }
              var args = Array.prototype.slice.call(arguments, 1);
              if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
              }
              else {
                callback();
              }
            });
          };

          async.queue = function (worker, concurrency) {
            if (concurrency === undefined) {
              concurrency = 1;
            }
            function _insert(q, data, pos, callback) {
              if (!q.started) {
                q.started = true;
              }
              if (!_isArray(data)) {
                data = [data];
              }
              if (data.length == 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function () {
                  if (q.drain) {
                    q.drain();
                  }
                });
              }
              _each(data, function (task) {
                var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
                };

                if (pos) {
                  q.tasks.unshift(item);
                } else {
                  q.tasks.push(item);
                }

                if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
                }
                async.setImmediate(q.process);
              });
            }

            var workers = 0;
            var q = {
              tasks: [],
              concurrency: concurrency,
              saturated: null,
              empty: null,
              drain: null,
              started: false,
              paused: false,
              push: function (data, callback) {
                _insert(q, data, false, callback);
              },
              kill: function () {
                q.drain = null;
                q.tasks = [];
              },
              unshift: function (data, callback) {
                _insert(q, data, true, callback);
              },
              process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                  var task = q.tasks.shift();
                  if (q.empty && q.tasks.length === 0) {
                    q.empty();
                  }
                  workers += 1;
                  var next = function () {
                    workers -= 1;
                    if (task.callback) {
                      task.callback.apply(task, arguments);
                    }
                    if (q.drain && q.tasks.length + workers === 0) {
                      q.drain();
                    }
                    q.process();
                  };
                  var cb = only_once(next);
                  worker(task.data, cb);
                }
              },
              length: function () {
                return q.tasks.length;
              },
              running: function () {
                return workers;
              },
              idle: function () {
                return q.tasks.length + workers === 0;
              },
              pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
              },
              resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= q.concurrency; w++) {
                  async.setImmediate(q.process);
                }
              }
            };
            return q;
          };

          async.priorityQueue = function (worker, concurrency) {

            function _compareTasks(a, b) {
              return a.priority - b.priority;
            };

            function _binarySearch(sequence, item, compare) {
              var beg = -1,
                end = sequence.length - 1;
              while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                  beg = mid;
                } else {
                  end = mid - 1;
                }
              }
              return beg;
            }

            function _insert(q, data, priority, callback) {
              if (!q.started) {
                q.started = true;
              }
              if (!_isArray(data)) {
                data = [data];
              }
              if (data.length == 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function () {
                  if (q.drain) {
                    q.drain();
                  }
                });
              }
              _each(data, function (task) {
                var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
                }
                async.setImmediate(q.process);
              });
            }

            // Start with a normal queue
            var q = async.queue(worker, concurrency);

            // Override push to accept second parameter representing priority
            q.push = function (data, priority, callback) {
              _insert(q, data, priority, callback);
            };

            // Remove unshift function
            delete q.unshift;

            return q;
          };

          async.cargo = function (worker, payload) {
            var working = false,
              tasks = [];

            var cargo = {
              tasks: tasks,
              payload: payload,
              saturated: null,
              empty: null,
              drain: null,
              drained: true,
              push: function (data, callback) {
                if (!_isArray(data)) {
                  data = [data];
                }
                _each(data, function (task) {
                  tasks.push({
                    data: task,
                    callback: typeof callback === 'function' ? callback : null
                  });
                  cargo.drained = false;
                  if (cargo.saturated && tasks.length === payload) {
                    cargo.saturated();
                  }
                });
                async.setImmediate(cargo.process);
              },
              process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                  if (cargo.drain && !cargo.drained) cargo.drain();
                  cargo.drained = true;
                  return;
                }

                var ts = typeof payload === 'number'
                  ? tasks.splice(0, payload)
                  : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                  return task.data;
                });

                if (cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                  working = false;

                  var args = arguments;
                  _each(ts, function (data) {
                    if (data.callback) {
                      data.callback.apply(null, args);
                    }
                  });

                  process();
                });
              },
              length: function () {
                return tasks.length;
              },
              running: function () {
                return working;
              }
            };
            return cargo;
          };

          var _console_fn = function (name) {
            return function (fn) {
              var args = Array.prototype.slice.call(arguments, 1);
              fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                  if (err) {
                    if (console.error) {
                      console.error(err);
                    }
                  }
                  else if (console[name]) {
                    _each(args, function (x) {
                      console[name](x);
                    });
                  }
                }
              }]));
            };
          };
          async.log = _console_fn('log');
          async.dir = _console_fn('dir');
          /*async.info = _console_fn('info');
          async.warn = _console_fn('warn');
          async.error = _console_fn('error');*/

          async.memoize = function (fn, hasher) {
            var memo = {};
            var queues = {};
            hasher = hasher || function (x) {
              return x;
            };
            var memoized = function () {
              var args = Array.prototype.slice.call(arguments);
              var callback = args.pop();
              var key = hasher.apply(null, args);
              if (key in memo) {
                async.nextTick(function () {
                  callback.apply(null, memo[key]);
                });
              }
              else if (key in queues) {
                queues[key].push(callback);
              }
              else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                  memo[key] = arguments;
                  var q = queues[key];
                  delete queues[key];
                  for (var i = 0, l = q.length; i < l; i++) {
                    q[i].apply(null, arguments);
                  }
                }]));
              }
            };
            memoized.memo = memo;
            memoized.unmemoized = fn;
            return memoized;
          };

          async.unmemoize = function (fn) {
            return function () {
              return (fn.unmemoized || fn).apply(null, arguments);
            };
          };

          async.times = function (count, iterator, callback) {
            var counter = [];
            for (var i = 0; i < count; i++) {
              counter.push(i);
            }
            return async.map(counter, iterator, callback);
          };

          async.timesSeries = function (count, iterator, callback) {
            var counter = [];
            for (var i = 0; i < count; i++) {
              counter.push(i);
            }
            return async.mapSeries(counter, iterator, callback);
          };

          async.seq = function (/* functions... */) {
            var fns = arguments;
            return function () {
              var that = this;
              var args = Array.prototype.slice.call(arguments);
              var callback = args.pop();
              async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                  var err = arguments[0];
                  var nextargs = Array.prototype.slice.call(arguments, 1);
                  cb(err, nextargs);
                }]))
              },
                function (err, results) {
                  callback.apply(that, [err].concat(results));
                });
            };
          };

          async.compose = function (/* functions... */) {
            return async.seq.apply(null, Array.prototype.reverse.call(arguments));
          };

          var _applyEach = function (eachfn, fns /*args...*/) {
            var go = function () {
              var that = this;
              var args = Array.prototype.slice.call(arguments);
              var callback = args.pop();
              return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
              },
                callback);
            };
            if (arguments.length > 2) {
              var args = Array.prototype.slice.call(arguments, 2);
              return go.apply(this, args);
            }
            else {
              return go;
            }
          };
          async.applyEach = doParallel(_applyEach);
          async.applyEachSeries = doSeries(_applyEach);

          async.forever = function (fn, callback) {
            function next(err) {
              if (err) {
                if (callback) {
                  return callback(err);
                }
                throw err;
              }
              fn(next);
            }
            next();
          };

          // Node.js
          if (true && module.exports) {
            module.exports = async;
          }
          // AMD / RequireJS
          else if (true) {
            !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function () {
              return async;
            }).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
              __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
          }
          // included directly via <script> tag
          else { }

        }());


        /***/
      }),

/***/ "./node_modules/stream-browserify/index.js":
/*!*************************************************!*\
  !*** ./node_modules/stream-browserify/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.

        module.exports = Stream;

        var EE = (__webpack_require__(/*! events */ "./node_modules/events/events.js").EventEmitter);
        var inherits = __webpack_require__(/*! inherits */ "./node_modules/inherits/inherits_browser.js");

        inherits(Stream, EE);
        Stream.Readable = __webpack_require__(/*! readable-stream/lib/_stream_readable.js */ "./node_modules/readable-stream/lib/_stream_readable.js");
        Stream.Writable = __webpack_require__(/*! readable-stream/lib/_stream_writable.js */ "./node_modules/readable-stream/lib/_stream_writable.js");
        Stream.Duplex = __webpack_require__(/*! readable-stream/lib/_stream_duplex.js */ "./node_modules/readable-stream/lib/_stream_duplex.js");
        Stream.Transform = __webpack_require__(/*! readable-stream/lib/_stream_transform.js */ "./node_modules/readable-stream/lib/_stream_transform.js");
        Stream.PassThrough = __webpack_require__(/*! readable-stream/lib/_stream_passthrough.js */ "./node_modules/readable-stream/lib/_stream_passthrough.js");
        Stream.finished = __webpack_require__(/*! readable-stream/lib/internal/streams/end-of-stream.js */ "./node_modules/readable-stream/lib/internal/streams/end-of-stream.js")
        Stream.pipeline = __webpack_require__(/*! readable-stream/lib/internal/streams/pipeline.js */ "./node_modules/readable-stream/lib/internal/streams/pipeline.js")

        // Backwards-compat with node 0.4.x
        Stream.Stream = Stream;



        // old-style streams.  Note that the pipe method (the only relevant
        // part of this class) is overridden in the Readable class.

        function Stream() {
          EE.call(this);
        }

        Stream.prototype.pipe = function (dest, options) {
          var source = this;

          function ondata(chunk) {
            if (dest.writable) {
              if (false === dest.write(chunk) && source.pause) {
                source.pause();
              }
            }
          }

          source.on('data', ondata);

          function ondrain() {
            if (source.readable && source.resume) {
              source.resume();
            }
          }

          dest.on('drain', ondrain);

          // If the 'end' option is not supplied, dest.end() will be called when
          // source gets the 'end' or 'close' events.  Only dest.end() once.
          if (!dest._isStdio && (!options || options.end !== false)) {
            source.on('end', onend);
            source.on('close', onclose);
          }

          var didOnEnd = false;
          function onend() {
            if (didOnEnd) return;
            didOnEnd = true;

            dest.end();
          }


          function onclose() {
            if (didOnEnd) return;
            didOnEnd = true;

            if (typeof dest.destroy === 'function') dest.destroy();
          }

          // don't leave dangling pipes when there are errors.
          function onerror(er) {
            cleanup();
            if (EE.listenerCount(this, 'error') === 0) {
              throw er; // Unhandled stream error in pipe.
            }
          }

          source.on('error', onerror);
          dest.on('error', onerror);

          // remove all the event listeners that were added.
          function cleanup() {
            source.removeListener('data', ondata);
            dest.removeListener('drain', ondrain);

            source.removeListener('end', onend);
            source.removeListener('close', onclose);

            source.removeListener('error', onerror);
            dest.removeListener('error', onerror);

            source.removeListener('end', cleanup);
            source.removeListener('close', cleanup);

            dest.removeListener('close', cleanup);
          }

          source.on('end', cleanup);
          source.on('close', cleanup);

          dest.on('close', cleanup);

          dest.emit('pipe', source);

          // Allow for unix-like usage: A.pipe(B).pipe(C)
          return dest;
        };


        /***/
      }),

/***/ "./node_modules/string_decoder/lib/string_decoder.js":
/*!***********************************************************!*\
  !*** ./node_modules/string_decoder/lib/string_decoder.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

        "use strict";
        // Copyright Joyent, Inc. and other Node contributors.
        //
        // Permission is hereby granted, free of charge, to any person obtaining a
        // copy of this software and associated documentation files (the
        // "Software"), to deal in the Software without restriction, including
        // without limitation the rights to use, copy, modify, merge, publish,
        // distribute, sublicense, and/or sell copies of the Software, and to permit
        // persons to whom the Software is furnished to do so, subject to the
        // following conditions:
        //
        // The above copyright notice and this permission notice shall be included
        // in all copies or substantial portions of the Software.
        //
        // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
        // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
        // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
        // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
        // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
        // USE OR OTHER DEALINGS IN THE SOFTWARE.



        /*<replacement>*/

        var Buffer = (__webpack_require__(/*! safe-buffer */ "./node_modules/safe-buffer/index.js").Buffer);
        /*</replacement>*/

        var isEncoding = Buffer.isEncoding || function (encoding) {
          encoding = '' + encoding;
          switch (encoding && encoding.toLowerCase()) {
            case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw':
              return true;
            default:
              return false;
          }
        };

        function _normalizeEncoding(enc) {
          if (!enc) return 'utf8';
          var retried;
          while (true) {
            switch (enc) {
              case 'utf8':
              case 'utf-8':
                return 'utf8';
              case 'ucs2':
              case 'ucs-2':
              case 'utf16le':
              case 'utf-16le':
                return 'utf16le';
              case 'latin1':
              case 'binary':
                return 'latin1';
              case 'base64':
              case 'ascii':
              case 'hex':
                return enc;
              default:
                if (retried) return; // undefined
                enc = ('' + enc).toLowerCase();
                retried = true;
            }
          }
        };

        // Do not cache `Buffer.isEncoding` when checking encoding names as some
        // modules monkey-patch it to support additional encodings
        function normalizeEncoding(enc) {
          var nenc = _normalizeEncoding(enc);
          if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
          return nenc || enc;
        }

        // StringDecoder provides an interface for efficiently splitting a series of
        // buffers into a series of JS strings without breaking apart multi-byte
        // characters.
        exports.StringDecoder = StringDecoder;
        function StringDecoder(encoding) {
          this.encoding = normalizeEncoding(encoding);
          var nb;
          switch (this.encoding) {
            case 'utf16le':
              this.text = utf16Text;
              this.end = utf16End;
              nb = 4;
              break;
            case 'utf8':
              this.fillLast = utf8FillLast;
              nb = 4;
              break;
            case 'base64':
              this.text = base64Text;
              this.end = base64End;
              nb = 3;
              break;
            default:
              this.write = simpleWrite;
              this.end = simpleEnd;
              return;
          }
          this.lastNeed = 0;
          this.lastTotal = 0;
          this.lastChar = Buffer.allocUnsafe(nb);
        }

        StringDecoder.prototype.write = function (buf) {
          if (buf.length === 0) return '';
          var r;
          var i;
          if (this.lastNeed) {
            r = this.fillLast(buf);
            if (r === undefined) return '';
            i = this.lastNeed;
            this.lastNeed = 0;
          } else {
            i = 0;
          }
          if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
          return r || '';
        };

        StringDecoder.prototype.end = utf8End;

        // Returns only complete characters in a Buffer
        StringDecoder.prototype.text = utf8Text;

        // Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
        StringDecoder.prototype.fillLast = function (buf) {
          if (this.lastNeed <= buf.length) {
            buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
            return this.lastChar.toString(this.encoding, 0, this.lastTotal);
          }
          buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
          this.lastNeed -= buf.length;
        };

        // Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
        // continuation byte. If an invalid byte is detected, -2 is returned.
        function utf8CheckByte(byte) {
          if (byte <= 0x7F) return 0; else if (byte >> 5 === 0x06) return 2; else if (byte >> 4 === 0x0E) return 3; else if (byte >> 3 === 0x1E) return 4;
          return byte >> 6 === 0x02 ? -1 : -2;
        }

        // Checks at most 3 bytes at the end of a Buffer in order to detect an
        // incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
        // needed to complete the UTF-8 character (if applicable) are returned.
        function utf8CheckIncomplete(self, buf, i) {
          var j = buf.length - 1;
          if (j < i) return 0;
          var nb = utf8CheckByte(buf[j]);
          if (nb >= 0) {
            if (nb > 0) self.lastNeed = nb - 1;
            return nb;
          }
          if (--j < i || nb === -2) return 0;
          nb = utf8CheckByte(buf[j]);
          if (nb >= 0) {
            if (nb > 0) self.lastNeed = nb - 2;
            return nb;
          }
          if (--j < i || nb === -2) return 0;
          nb = utf8CheckByte(buf[j]);
          if (nb >= 0) {
            if (nb > 0) {
              if (nb === 2) nb = 0; else self.lastNeed = nb - 3;
            }
            return nb;
          }
          return 0;
        }

        // Validates as many continuation bytes for a multi-byte UTF-8 character as
        // needed or are available. If we see a non-continuation byte where we expect
        // one, we "replace" the validated continuation bytes we've seen so far with
        // a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
        // behavior. The continuation byte check is included three times in the case
        // where all of the continuation bytes for a character exist in the same buffer.
        // It is also done this way as a slight performance increase instead of using a
        // loop.
        function utf8CheckExtraBytes(self, buf, p) {
          if ((buf[0] & 0xC0) !== 0x80) {
            self.lastNeed = 0;
            return '\ufffd';
          }
          if (self.lastNeed > 1 && buf.length > 1) {
            if ((buf[1] & 0xC0) !== 0x80) {
              self.lastNeed = 1;
              return '\ufffd';
            }
            if (self.lastNeed > 2 && buf.length > 2) {
              if ((buf[2] & 0xC0) !== 0x80) {
                self.lastNeed = 2;
                return '\ufffd';
              }
            }
          }
        }

        // Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
        function utf8FillLast(buf) {
          var p = this.lastTotal - this.lastNeed;
          var r = utf8CheckExtraBytes(this, buf, p);
          if (r !== undefined) return r;
          if (this.lastNeed <= buf.length) {
            buf.copy(this.lastChar, p, 0, this.lastNeed);
            return this.lastChar.toString(this.encoding, 0, this.lastTotal);
          }
          buf.copy(this.lastChar, p, 0, buf.length);
          this.lastNeed -= buf.length;
        }

        // Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
        // partial character, the character's bytes are buffered until the required
        // number of bytes are available.
        function utf8Text(buf, i) {
          var total = utf8CheckIncomplete(this, buf, i);
          if (!this.lastNeed) return buf.toString('utf8', i);
          this.lastTotal = total;
          var end = buf.length - (total - this.lastNeed);
          buf.copy(this.lastChar, 0, end);
          return buf.toString('utf8', i, end);
        }

        // For UTF-8, a replacement character is added when ending on a partial
        // character.
        function utf8End(buf) {
          var r = buf && buf.length ? this.write(buf) : '';
          if (this.lastNeed) return r + '\ufffd';
          return r;
        }

        // UTF-16LE typically needs two bytes per character, but even if we have an even
        // number of bytes available, we need to check if we end on a leading/high
        // surrogate. In that case, we need to wait for the next two bytes in order to
        // decode the last character properly.
        function utf16Text(buf, i) {
          if ((buf.length - i) % 2 === 0) {
            var r = buf.toString('utf16le', i);
            if (r) {
              var c = r.charCodeAt(r.length - 1);
              if (c >= 0xD800 && c <= 0xDBFF) {
                this.lastNeed = 2;
                this.lastTotal = 4;
                this.lastChar[0] = buf[buf.length - 2];
                this.lastChar[1] = buf[buf.length - 1];
                return r.slice(0, -1);
              }
            }
            return r;
          }
          this.lastNeed = 1;
          this.lastTotal = 2;
          this.lastChar[0] = buf[buf.length - 1];
          return buf.toString('utf16le', i, buf.length - 1);
        }

        // For UTF-16LE we do not explicitly append special replacement characters if we
        // end on a partial character, we simply let v8 handle that.
        function utf16End(buf) {
          var r = buf && buf.length ? this.write(buf) : '';
          if (this.lastNeed) {
            var end = this.lastTotal - this.lastNeed;
            return r + this.lastChar.toString('utf16le', 0, end);
          }
          return r;
        }

        function base64Text(buf, i) {
          var n = (buf.length - i) % 3;
          if (n === 0) return buf.toString('base64', i);
          this.lastNeed = 3 - n;
          this.lastTotal = 3;
          if (n === 1) {
            this.lastChar[0] = buf[buf.length - 1];
          } else {
            this.lastChar[0] = buf[buf.length - 2];
            this.lastChar[1] = buf[buf.length - 1];
          }
          return buf.toString('base64', i, buf.length - n);
        }

        function base64End(buf) {
          var r = buf && buf.length ? this.write(buf) : '';
          if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
          return r;
        }

        // Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
        function simpleWrite(buf) {
          return buf.toString(this.encoding);
        }

        function simpleEnd(buf) {
          return buf && buf.length ? this.write(buf) : '';
        }

        /***/
      }),

/***/ "./node_modules/util-deprecate/browser.js":
/*!************************************************!*\
  !*** ./node_modules/util-deprecate/browser.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


        /**
         * Module exports.
         */

        module.exports = deprecate;

        /**
         * Mark that a method should not be used.
         * Returns a modified function which warns once by default.
         *
         * If `localStorage.noDeprecation = true` is set, then it is a no-op.
         *
         * If `localStorage.throwDeprecation = true` is set, then deprecated functions
         * will throw an Error when invoked.
         *
         * If `localStorage.traceDeprecation = true` is set, then deprecated functions
         * will invoke `console.trace()` instead of `console.error()`.
         *
         * @param {Function} fn - the function to deprecate
         * @param {String} msg - the string to print to the console when `fn` is invoked
         * @returns {Function} a new "deprecated" version of `fn`
         * @api public
         */

        function deprecate(fn, msg) {
          if (config('noDeprecation')) {
            return fn;
          }

          var warned = false;
          function deprecated() {
            if (!warned) {
              if (config('throwDeprecation')) {
                throw new Error(msg);
              } else if (config('traceDeprecation')) {
                console.trace(msg);
              } else {
                console.warn(msg);
              }
              warned = true;
            }
            return fn.apply(this, arguments);
          }

          return deprecated;
        }

        /**
         * Checks `localStorage` for boolean values for the given `name`.
         *
         * @param {String} name
         * @returns {Boolean}
         * @api private
         */

        function config(name) {
          // accessing global.localStorage can trigger a DOMException in sandboxed iframes
          try {
            if (!__webpack_require__.g.localStorage) return false;
          } catch (_) {
            return false;
          }
          var val = __webpack_require__.g.localStorage[name];
          if (null == val) return false;
          return String(val).toLowerCase() === 'true';
        }


        /***/
      }),

/***/ "?ed1b":
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/***/ (() => {

        /* (ignored) */

        /***/
      }),

/***/ "?d17e":
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/***/ (() => {

        /* (ignored) */

        /***/
      }),

/***/ "./node_modules/async/dist/async.mjs":
/*!*******************************************!*\
  !*** ./node_modules/async/dist/async.mjs ***!
  \*******************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

        "use strict";
        __webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "all": () => (/* binding */ every$1),
/* harmony export */   "allLimit": () => (/* binding */ everyLimit$1),
/* harmony export */   "allSeries": () => (/* binding */ everySeries$1),
/* harmony export */   "any": () => (/* binding */ some$1),
/* harmony export */   "anyLimit": () => (/* binding */ someLimit$1),
/* harmony export */   "anySeries": () => (/* binding */ someSeries$1),
/* harmony export */   "apply": () => (/* binding */ apply),
/* harmony export */   "applyEach": () => (/* binding */ applyEach$1),
/* harmony export */   "applyEachSeries": () => (/* binding */ applyEachSeries),
/* harmony export */   "asyncify": () => (/* binding */ asyncify),
/* harmony export */   "auto": () => (/* binding */ auto),
/* harmony export */   "autoInject": () => (/* binding */ autoInject),
/* harmony export */   "cargo": () => (/* binding */ cargo),
/* harmony export */   "cargoQueue": () => (/* binding */ cargo$1),
/* harmony export */   "compose": () => (/* binding */ compose),
/* harmony export */   "concat": () => (/* binding */ concat$1),
/* harmony export */   "concatLimit": () => (/* binding */ concatLimit$1),
/* harmony export */   "concatSeries": () => (/* binding */ concatSeries$1),
/* harmony export */   "constant": () => (/* binding */ constant),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   "detect": () => (/* binding */ detect$1),
/* harmony export */   "detectLimit": () => (/* binding */ detectLimit$1),
/* harmony export */   "detectSeries": () => (/* binding */ detectSeries$1),
/* harmony export */   "dir": () => (/* binding */ dir),
/* harmony export */   "doDuring": () => (/* binding */ doWhilst$1),
/* harmony export */   "doUntil": () => (/* binding */ doUntil),
/* harmony export */   "doWhilst": () => (/* binding */ doWhilst$1),
/* harmony export */   "during": () => (/* binding */ whilst$1),
/* harmony export */   "each": () => (/* binding */ each),
/* harmony export */   "eachLimit": () => (/* binding */ eachLimit$2),
/* harmony export */   "eachOf": () => (/* binding */ eachOf$1),
/* harmony export */   "eachOfLimit": () => (/* binding */ eachOfLimit$2),
/* harmony export */   "eachOfSeries": () => (/* binding */ eachOfSeries$1),
/* harmony export */   "eachSeries": () => (/* binding */ eachSeries$1),
/* harmony export */   "ensureAsync": () => (/* binding */ ensureAsync),
/* harmony export */   "every": () => (/* binding */ every$1),
/* harmony export */   "everyLimit": () => (/* binding */ everyLimit$1),
/* harmony export */   "everySeries": () => (/* binding */ everySeries$1),
/* harmony export */   "filter": () => (/* binding */ filter$1),
/* harmony export */   "filterLimit": () => (/* binding */ filterLimit$1),
/* harmony export */   "filterSeries": () => (/* binding */ filterSeries$1),
/* harmony export */   "find": () => (/* binding */ detect$1),
/* harmony export */   "findLimit": () => (/* binding */ detectLimit$1),
/* harmony export */   "findSeries": () => (/* binding */ detectSeries$1),
/* harmony export */   "flatMap": () => (/* binding */ concat$1),
/* harmony export */   "flatMapLimit": () => (/* binding */ concatLimit$1),
/* harmony export */   "flatMapSeries": () => (/* binding */ concatSeries$1),
/* harmony export */   "foldl": () => (/* binding */ reduce$1),
/* harmony export */   "foldr": () => (/* binding */ reduceRight),
/* harmony export */   "forEach": () => (/* binding */ each),
/* harmony export */   "forEachLimit": () => (/* binding */ eachLimit$2),
/* harmony export */   "forEachOf": () => (/* binding */ eachOf$1),
/* harmony export */   "forEachOfLimit": () => (/* binding */ eachOfLimit$2),
/* harmony export */   "forEachOfSeries": () => (/* binding */ eachOfSeries$1),
/* harmony export */   "forEachSeries": () => (/* binding */ eachSeries$1),
/* harmony export */   "forever": () => (/* binding */ forever$1),
/* harmony export */   "groupBy": () => (/* binding */ groupBy),
/* harmony export */   "groupByLimit": () => (/* binding */ groupByLimit$1),
/* harmony export */   "groupBySeries": () => (/* binding */ groupBySeries),
/* harmony export */   "inject": () => (/* binding */ reduce$1),
/* harmony export */   "log": () => (/* binding */ log),
/* harmony export */   "map": () => (/* binding */ map$1),
/* harmony export */   "mapLimit": () => (/* binding */ mapLimit$1),
/* harmony export */   "mapSeries": () => (/* binding */ mapSeries$1),
/* harmony export */   "mapValues": () => (/* binding */ mapValues),
/* harmony export */   "mapValuesLimit": () => (/* binding */ mapValuesLimit$1),
/* harmony export */   "mapValuesSeries": () => (/* binding */ mapValuesSeries),
/* harmony export */   "memoize": () => (/* binding */ memoize),
/* harmony export */   "nextTick": () => (/* binding */ nextTick),
/* harmony export */   "parallel": () => (/* binding */ parallel$1),
/* harmony export */   "parallelLimit": () => (/* binding */ parallelLimit),
/* harmony export */   "priorityQueue": () => (/* binding */ priorityQueue),
/* harmony export */   "queue": () => (/* binding */ queue$1),
/* harmony export */   "race": () => (/* binding */ race$1),
/* harmony export */   "reduce": () => (/* binding */ reduce$1),
/* harmony export */   "reduceRight": () => (/* binding */ reduceRight),
/* harmony export */   "reflect": () => (/* binding */ reflect),
/* harmony export */   "reflectAll": () => (/* binding */ reflectAll),
/* harmony export */   "reject": () => (/* binding */ reject$2),
/* harmony export */   "rejectLimit": () => (/* binding */ rejectLimit$1),
/* harmony export */   "rejectSeries": () => (/* binding */ rejectSeries$1),
/* harmony export */   "retry": () => (/* binding */ retry),
/* harmony export */   "retryable": () => (/* binding */ retryable),
/* harmony export */   "select": () => (/* binding */ filter$1),
/* harmony export */   "selectLimit": () => (/* binding */ filterLimit$1),
/* harmony export */   "selectSeries": () => (/* binding */ filterSeries$1),
/* harmony export */   "seq": () => (/* binding */ seq),
/* harmony export */   "series": () => (/* binding */ series),
/* harmony export */   "setImmediate": () => (/* binding */ setImmediate$1),
/* harmony export */   "some": () => (/* binding */ some$1),
/* harmony export */   "someLimit": () => (/* binding */ someLimit$1),
/* harmony export */   "someSeries": () => (/* binding */ someSeries$1),
/* harmony export */   "sortBy": () => (/* binding */ sortBy$1),
/* harmony export */   "timeout": () => (/* binding */ timeout),
/* harmony export */   "times": () => (/* binding */ times),
/* harmony export */   "timesLimit": () => (/* binding */ timesLimit),
/* harmony export */   "timesSeries": () => (/* binding */ timesSeries),
/* harmony export */   "transform": () => (/* binding */ transform),
/* harmony export */   "tryEach": () => (/* binding */ tryEach$1),
/* harmony export */   "unmemoize": () => (/* binding */ unmemoize),
/* harmony export */   "until": () => (/* binding */ until),
/* harmony export */   "waterfall": () => (/* binding */ waterfall$1),
/* harmony export */   "whilst": () => (/* binding */ whilst$1),
/* harmony export */   "wrapSync": () => (/* binding */ asyncify)
          /* harmony export */
        });
/* provided dependency */ var process = __webpack_require__(/*! process */ "./node_modules/process/browser.js");
        /**
         * Creates a continuation function with some arguments already applied.
         *
         * Useful as a shorthand when combined with other control flow functions. Any
         * arguments passed to the returned function are added to the arguments
         * originally passed to apply.
         *
         * @name apply
         * @static
         * @memberOf module:Utils
         * @method
         * @category Util
         * @param {Function} fn - The function you want to eventually apply all
         * arguments to. Invokes with (arguments...).
         * @param {...*} arguments... - Any number of arguments to automatically apply
         * when the continuation is called.
         * @returns {Function} the partially-applied function
         * @example
         *
         * // using apply
         * async.parallel([
         *     async.apply(fs.writeFile, 'testfile1', 'test1'),
         *     async.apply(fs.writeFile, 'testfile2', 'test2')
         * ]);
         *
         *
         * // the same process without using apply
         * async.parallel([
         *     function(callback) {
         *         fs.writeFile('testfile1', 'test1', callback);
         *     },
         *     function(callback) {
         *         fs.writeFile('testfile2', 'test2', callback);
         *     }
         * ]);
         *
         * // It's possible to pass any number of additional arguments when calling the
         * // continuation:
         *
         * node> var fn = async.apply(sys.puts, 'one');
         * node> fn('two', 'three');
         * one
         * two
         * three
         */
        function apply(fn, ...args) {
          return (...callArgs) => fn(...args, ...callArgs);
        }

        function initialParams(fn) {
          return function (...args/*, callback*/) {
            var callback = args.pop();
            return fn.call(this, args, callback);
          };
        }

        /* istanbul ignore file */

        var hasQueueMicrotask = typeof queueMicrotask === 'function' && queueMicrotask;
        var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
        var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

        function fallback(fn) {
          setTimeout(fn, 0);
        }

        function wrap(defer) {
          return (fn, ...args) => defer(() => fn(...args));
        }

        var _defer;

        if (hasQueueMicrotask) {
          _defer = queueMicrotask;
        } else if (hasSetImmediate) {
          _defer = setImmediate;
        } else if (hasNextTick) {
          _defer = process.nextTick;
        } else {
          _defer = fallback;
        }

        var setImmediate$1 = wrap(_defer);

        /**
         * Take a sync function and make it async, passing its return value to a
         * callback. This is useful for plugging sync functions into a waterfall,
         * series, or other async functions. Any arguments passed to the generated
         * function will be passed to the wrapped function (except for the final
         * callback argument). Errors thrown will be passed to the callback.
         *
         * If the function passed to `asyncify` returns a Promise, that promises's
         * resolved/rejected state will be used to call the callback, rather than simply
         * the synchronous return value.
         *
         * This also means you can asyncify ES2017 `async` functions.
         *
         * @name asyncify
         * @static
         * @memberOf module:Utils
         * @method
         * @alias wrapSync
         * @category Util
         * @param {Function} func - The synchronous function, or Promise-returning
         * function to convert to an {@link AsyncFunction}.
         * @returns {AsyncFunction} An asynchronous wrapper of the `func`. To be
         * invoked with `(args..., callback)`.
         * @example
         *
         * // passing a regular synchronous function
         * async.waterfall([
         *     async.apply(fs.readFile, filename, "utf8"),
         *     async.asyncify(JSON.parse),
         *     function (data, next) {
         *         // data is the result of parsing the text.
         *         // If there was a parsing error, it would have been caught.
         *     }
         * ], callback);
         *
         * // passing a function returning a promise
         * async.waterfall([
         *     async.apply(fs.readFile, filename, "utf8"),
         *     async.asyncify(function (contents) {
         *         return db.model.create(contents);
         *     }),
         *     function (model, next) {
         *         // `model` is the instantiated model object.
         *         // If there was an error, this function would be skipped.
         *     }
         * ], callback);
         *
         * // es2017 example, though `asyncify` is not needed if your JS environment
         * // supports async functions out of the box
         * var q = async.queue(async.asyncify(async function(file) {
         *     var intermediateStep = await processFile(file);
         *     return await somePromise(intermediateStep)
         * }));
         *
         * q.push(files);
         */
        function asyncify(func) {
          if (isAsync(func)) {
            return function (...args/*, callback*/) {
              const callback = args.pop();
              const promise = func.apply(this, args);
              return handlePromise(promise, callback)
            }
          }

          return initialParams(function (args, callback) {
            var result;
            try {
              result = func.apply(this, args);
            } catch (e) {
              return callback(e);
            }
            // if result is Promise object
            if (result && typeof result.then === 'function') {
              return handlePromise(result, callback)
            } else {
              callback(null, result);
            }
          });
        }

        function handlePromise(promise, callback) {
          return promise.then(value => {
            invokeCallback(callback, null, value);
          }, err => {
            invokeCallback(callback, err && err.message ? err : new Error(err));
          });
        }

        function invokeCallback(callback, error, value) {
          try {
            callback(error, value);
          } catch (err) {
            setImmediate$1(e => { throw e }, err);
          }
        }

        function isAsync(fn) {
          return fn[Symbol.toStringTag] === 'AsyncFunction';
        }

        function isAsyncGenerator(fn) {
          return fn[Symbol.toStringTag] === 'AsyncGenerator';
        }

        function isAsyncIterable(obj) {
          return typeof obj[Symbol.asyncIterator] === 'function';
        }

        function wrapAsync(asyncFn) {
          if (typeof asyncFn !== 'function') throw new Error('expected a function')
          return isAsync(asyncFn) ? asyncify(asyncFn) : asyncFn;
        }

        // conditionally promisify a function.
        // only return a promise if a callback is omitted
        function awaitify(asyncFn, arity = asyncFn.length) {
          if (!arity) throw new Error('arity is undefined')
          function awaitable(...args) {
            if (typeof args[arity - 1] === 'function') {
              return asyncFn.apply(this, args)
            }

            return new Promise((resolve, reject) => {
              args[arity - 1] = (err, ...cbArgs) => {
                if (err) return reject(err)
                resolve(cbArgs.length > 1 ? cbArgs : cbArgs[0]);
              };
              asyncFn.apply(this, args);
            })
          }

          return awaitable
        }

        function applyEach(eachfn) {
          return function applyEach(fns, ...callArgs) {
            const go = awaitify(function (callback) {
              var that = this;
              return eachfn(fns, (fn, cb) => {
                wrapAsync(fn).apply(that, callArgs.concat(cb));
              }, callback);
            });
            return go;
          };
        }

        function _asyncMap(eachfn, arr, iteratee, callback) {
          arr = arr || [];
          var results = [];
          var counter = 0;
          var _iteratee = wrapAsync(iteratee);

          return eachfn(arr, (value, _, iterCb) => {
            var index = counter++;
            _iteratee(value, (err, v) => {
              results[index] = v;
              iterCb(err);
            });
          }, err => {
            callback(err, results);
          });
        }

        function isArrayLike(value) {
          return value &&
            typeof value.length === 'number' &&
            value.length >= 0 &&
            value.length % 1 === 0;
        }

        // A temporary value used to identify if the loop should be broken.
        // See #1064, #1293
        const breakLoop = {};

        function once(fn) {
          function wrapper(...args) {
            if (fn === null) return;
            var callFn = fn;
            fn = null;
            callFn.apply(this, args);
          }
          Object.assign(wrapper, fn);
          return wrapper
        }

        function getIterator(coll) {
          return coll[Symbol.iterator] && coll[Symbol.iterator]();
        }

        function createArrayIterator(coll) {
          var i = -1;
          var len = coll.length;
          return function next() {
            return ++i < len ? { value: coll[i], key: i } : null;
          }
        }

        function createES2015Iterator(iterator) {
          var i = -1;
          return function next() {
            var item = iterator.next();
            if (item.done)
              return null;
            i++;
            return { value: item.value, key: i };
          }
        }

        function createObjectIterator(obj) {
          var okeys = obj ? Object.keys(obj) : [];
          var i = -1;
          var len = okeys.length;
          return function next() {
            var key = okeys[++i];
            if (key === '__proto__') {
              return next();
            }
            return i < len ? { value: obj[key], key } : null;
          };
        }

        function createIterator(coll) {
          if (isArrayLike(coll)) {
            return createArrayIterator(coll);
          }

          var iterator = getIterator(coll);
          return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
        }

        function onlyOnce(fn) {
          return function (...args) {
            if (fn === null) throw new Error("Callback was already called.");
            var callFn = fn;
            fn = null;
            callFn.apply(this, args);
          };
        }

        // for async generators
        function asyncEachOfLimit(generator, limit, iteratee, callback) {
          let done = false;
          let canceled = false;
          let awaiting = false;
          let running = 0;
          let idx = 0;

          function replenish() {
            //console.log('replenish')
            if (running >= limit || awaiting || done) return
            //console.log('replenish awaiting')
            awaiting = true;
            generator.next().then(({ value, done: iterDone }) => {
              //console.log('got value', value)
              if (canceled || done) return
              awaiting = false;
              if (iterDone) {
                done = true;
                if (running <= 0) {
                  //console.log('done nextCb')
                  callback(null);
                }
                return;
              }
              running++;
              iteratee(value, idx, iterateeCallback);
              idx++;
              replenish();
            }).catch(handleError);
          }

          function iterateeCallback(err, result) {
            //console.log('iterateeCallback')
            running -= 1;
            if (canceled) return
            if (err) return handleError(err)

            if (err === false) {
              done = true;
              canceled = true;
              return
            }

            if (result === breakLoop || (done && running <= 0)) {
              done = true;
              //console.log('done iterCb')
              return callback(null);
            }
            replenish();
          }

          function handleError(err) {
            if (canceled) return
            awaiting = false;
            done = true;
            callback(err);
          }

          replenish();
        }

        var eachOfLimit = (limit) => {
          return (obj, iteratee, callback) => {
            callback = once(callback);
            if (limit <= 0) {
              throw new RangeError('concurrency limit cannot be less than 1')
            }
            if (!obj) {
              return callback(null);
            }
            if (isAsyncGenerator(obj)) {
              return asyncEachOfLimit(obj, limit, iteratee, callback)
            }
            if (isAsyncIterable(obj)) {
              return asyncEachOfLimit(obj[Symbol.asyncIterator](), limit, iteratee, callback)
            }
            var nextElem = createIterator(obj);
            var done = false;
            var canceled = false;
            var running = 0;
            var looping = false;

            function iterateeCallback(err, value) {
              if (canceled) return
              running -= 1;
              if (err) {
                done = true;
                callback(err);
              }
              else if (err === false) {
                done = true;
                canceled = true;
              }
              else if (value === breakLoop || (done && running <= 0)) {
                done = true;
                return callback(null);
              }
              else if (!looping) {
                replenish();
              }
            }

            function replenish() {
              looping = true;
              while (running < limit && !done) {
                var elem = nextElem();
                if (elem === null) {
                  done = true;
                  if (running <= 0) {
                    callback(null);
                  }
                  return;
                }
                running += 1;
                iteratee(elem.value, elem.key, onlyOnce(iterateeCallback));
              }
              looping = false;
            }

            replenish();
          };
        };

        /**
         * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
         * time.
         *
         * @name eachOfLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.eachOf]{@link module:Collections.eachOf}
         * @alias forEachOfLimit
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - An async function to apply to each
         * item in `coll`. The `key` is the item's key, or index in the case of an
         * array.
         * Invoked with (item, key, callback).
         * @param {Function} [callback] - A callback which is called when all
         * `iteratee` functions have finished, or an error occurs. Invoked with (err).
         * @returns {Promise} a promise, if a callback is omitted
         */
        function eachOfLimit$1(coll, limit, iteratee, callback) {
          return eachOfLimit(limit)(coll, wrapAsync(iteratee), callback);
        }

        var eachOfLimit$2 = awaitify(eachOfLimit$1, 4);

        // eachOf implementation optimized for array-likes
        function eachOfArrayLike(coll, iteratee, callback) {
          callback = once(callback);
          var index = 0,
            completed = 0,
            { length } = coll,
            canceled = false;
          if (length === 0) {
            callback(null);
          }

          function iteratorCallback(err, value) {
            if (err === false) {
              canceled = true;
            }
            if (canceled === true) return
            if (err) {
              callback(err);
            } else if ((++completed === length) || value === breakLoop) {
              callback(null);
            }
          }

          for (; index < length; index++) {
            iteratee(coll[index], index, onlyOnce(iteratorCallback));
          }
        }

        // a generic version of eachOf which can handle array, object, and iterator cases.
        function eachOfGeneric(coll, iteratee, callback) {
          return eachOfLimit$2(coll, Infinity, iteratee, callback);
        }

        /**
         * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
         * to the iteratee.
         *
         * @name eachOf
         * @static
         * @memberOf module:Collections
         * @method
         * @alias forEachOf
         * @category Collection
         * @see [async.each]{@link module:Collections.each}
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - A function to apply to each
         * item in `coll`.
         * The `key` is the item's key, or index in the case of an array.
         * Invoked with (item, key, callback).
         * @param {Function} [callback] - A callback which is called when all
         * `iteratee` functions have finished, or an error occurs. Invoked with (err).
         * @returns {Promise} a promise, if a callback is omitted
         * @example
         *
         * // dev.json is a file containing a valid json object config for dev environment
         * // dev.json is a file containing a valid json object config for test environment
         * // prod.json is a file containing a valid json object config for prod environment
         * // invalid.json is a file with a malformed json object
         *
         * let configs = {}; //global variable
         * let validConfigFileMap = {dev: 'dev.json', test: 'test.json', prod: 'prod.json'};
         * let invalidConfigFileMap = {dev: 'dev.json', test: 'test.json', invalid: 'invalid.json'};
         *
         * // asynchronous function that reads a json file and parses the contents as json object
         * function parseFile(file, key, callback) {
         *     fs.readFile(file, "utf8", function(err, data) {
         *         if (err) return calback(err);
         *         try {
         *             configs[key] = JSON.parse(data);
         *         } catch (e) {
         *             return callback(e);
         *         }
         *         callback();
         *     });
         * }
         *
         * // Using callbacks
         * async.forEachOf(validConfigFileMap, parseFile, function (err) {
         *     if (err) {
         *         console.error(err);
         *     } else {
         *         console.log(configs);
         *         // configs is now a map of JSON data, e.g.
         *         // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
         *     }
         * });
         *
         * //Error handing
         * async.forEachOf(invalidConfigFileMap, parseFile, function (err) {
         *     if (err) {
         *         console.error(err);
         *         // JSON parse error exception
         *     } else {
         *         console.log(configs);
         *     }
         * });
         *
         * // Using Promises
         * async.forEachOf(validConfigFileMap, parseFile)
         * .then( () => {
         *     console.log(configs);
         *     // configs is now a map of JSON data, e.g.
         *     // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
         * }).catch( err => {
         *     console.error(err);
         * });
         *
         * //Error handing
         * async.forEachOf(invalidConfigFileMap, parseFile)
         * .then( () => {
         *     console.log(configs);
         * }).catch( err => {
         *     console.error(err);
         *     // JSON parse error exception
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let result = await async.forEachOf(validConfigFileMap, parseFile);
         *         console.log(configs);
         *         // configs is now a map of JSON data, e.g.
         *         // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * //Error handing
         * async () => {
         *     try {
         *         let result = await async.forEachOf(invalidConfigFileMap, parseFile);
         *         console.log(configs);
         *     }
         *     catch (err) {
         *         console.log(err);
         *         // JSON parse error exception
         *     }
         * }
         *
         */
        function eachOf(coll, iteratee, callback) {
          var eachOfImplementation = isArrayLike(coll) ? eachOfArrayLike : eachOfGeneric;
          return eachOfImplementation(coll, wrapAsync(iteratee), callback);
        }

        var eachOf$1 = awaitify(eachOf, 3);

        /**
         * Produces a new collection of values by mapping each value in `coll` through
         * the `iteratee` function. The `iteratee` is called with an item from `coll`
         * and a callback for when it has finished processing. Each of these callbacks
         * takes 2 arguments: an `error`, and the transformed item from `coll`. If
         * `iteratee` passes an error to its callback, the main `callback` (for the
         * `map` function) is immediately called with the error.
         *
         * Note, that since this function applies the `iteratee` to each item in
         * parallel, there is no guarantee that the `iteratee` functions will complete
         * in order. However, the results array will be in the same order as the
         * original `coll`.
         *
         * If `map` is passed an Object, the results will be an Array.  The results
         * will roughly be in the order of the original Objects' keys (but this can
         * vary across JavaScript engines).
         *
         * @name map
         * @static
         * @memberOf module:Collections
         * @method
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * The iteratee should complete with the transformed item.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. Results is an Array of the
         * transformed items from the `coll`. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback is passed
         * @example
         *
         * // file1.txt is a file that is 1000 bytes in size
         * // file2.txt is a file that is 2000 bytes in size
         * // file3.txt is a file that is 3000 bytes in size
         * // file4.txt does not exist
         *
         * const fileList = ['file1.txt','file2.txt','file3.txt'];
         * const withMissingFileList = ['file1.txt','file2.txt','file4.txt'];
         *
         * // asynchronous function that returns the file size in bytes
         * function getFileSizeInBytes(file, callback) {
         *     fs.stat(file, function(err, stat) {
         *         if (err) {
         *             return callback(err);
         *         }
         *         callback(null, stat.size);
         *     });
         * }
         *
         * // Using callbacks
         * async.map(fileList, getFileSizeInBytes, function(err, results) {
         *     if (err) {
         *         console.log(err);
         *     } else {
         *         console.log(results);
         *         // results is now an array of the file size in bytes for each file, e.g.
         *         // [ 1000, 2000, 3000]
         *     }
         * });
         *
         * // Error Handling
         * async.map(withMissingFileList, getFileSizeInBytes, function(err, results) {
         *     if (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *     } else {
         *         console.log(results);
         *     }
         * });
         *
         * // Using Promises
         * async.map(fileList, getFileSizeInBytes)
         * .then( results => {
         *     console.log(results);
         *     // results is now an array of the file size in bytes for each file, e.g.
         *     // [ 1000, 2000, 3000]
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * // Error Handling
         * async.map(withMissingFileList, getFileSizeInBytes)
         * .then( results => {
         *     console.log(results);
         * }).catch( err => {
         *     console.log(err);
         *     // [ Error: ENOENT: no such file or directory ]
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let results = await async.map(fileList, getFileSizeInBytes);
         *         console.log(results);
         *         // results is now an array of the file size in bytes for each file, e.g.
         *         // [ 1000, 2000, 3000]
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * // Error Handling
         * async () => {
         *     try {
         *         let results = await async.map(withMissingFileList, getFileSizeInBytes);
         *         console.log(results);
         *     }
         *     catch (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *     }
         * }
         *
         */
        function map(coll, iteratee, callback) {
          return _asyncMap(eachOf$1, coll, iteratee, callback)
        }
        var map$1 = awaitify(map, 3);

        /**
         * Applies the provided arguments to each function in the array, calling
         * `callback` after all functions have completed. If you only provide the first
         * argument, `fns`, then it will return a function which lets you pass in the
         * arguments as if it were a single function call. If more arguments are
         * provided, `callback` is required while `args` is still optional. The results
         * for each of the applied async functions are passed to the final callback
         * as an array.
         *
         * @name applyEach
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {Array|Iterable|AsyncIterable|Object} fns - A collection of {@link AsyncFunction}s
         * to all call with the same arguments
         * @param {...*} [args] - any number of separate arguments to pass to the
         * function.
         * @param {Function} [callback] - the final argument should be the callback,
         * called when all functions have completed processing.
         * @returns {AsyncFunction} - Returns a function that takes no args other than
         * an optional callback, that is the result of applying the `args` to each
         * of the functions.
         * @example
         *
         * const appliedFn = async.applyEach([enableSearch, updateSchema], 'bucket')
         *
         * appliedFn((err, results) => {
         *     // results[0] is the results for `enableSearch`
         *     // results[1] is the results for `updateSchema`
         * });
         *
         * // partial application example:
         * async.each(
         *     buckets,
         *     async (bucket) => async.applyEach([enableSearch, updateSchema], bucket)(),
         *     callback
         * );
         */
        var applyEach$1 = applyEach(map$1);

        /**
         * The same as [`eachOf`]{@link module:Collections.eachOf} but runs only a single async operation at a time.
         *
         * @name eachOfSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.eachOf]{@link module:Collections.eachOf}
         * @alias forEachOfSeries
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * Invoked with (item, key, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. Invoked with (err).
         * @returns {Promise} a promise, if a callback is omitted
         */
        function eachOfSeries(coll, iteratee, callback) {
          return eachOfLimit$2(coll, 1, iteratee, callback)
        }
        var eachOfSeries$1 = awaitify(eachOfSeries, 3);

        /**
         * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
         *
         * @name mapSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.map]{@link module:Collections.map}
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * The iteratee should complete with the transformed item.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. Results is an array of the
         * transformed items from the `coll`. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback is passed
         */
        function mapSeries(coll, iteratee, callback) {
          return _asyncMap(eachOfSeries$1, coll, iteratee, callback)
        }
        var mapSeries$1 = awaitify(mapSeries, 3);

        /**
         * The same as [`applyEach`]{@link module:ControlFlow.applyEach} but runs only a single async operation at a time.
         *
         * @name applyEachSeries
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.applyEach]{@link module:ControlFlow.applyEach}
         * @category Control Flow
         * @param {Array|Iterable|AsyncIterable|Object} fns - A collection of {@link AsyncFunction}s to all
         * call with the same arguments
         * @param {...*} [args] - any number of separate arguments to pass to the
         * function.
         * @param {Function} [callback] - the final argument should be the callback,
         * called when all functions have completed processing.
         * @returns {AsyncFunction} - A function, that when called, is the result of
         * appling the `args` to the list of functions.  It takes no args, other than
         * a callback.
         */
        var applyEachSeries = applyEach(mapSeries$1);

        const PROMISE_SYMBOL = Symbol('promiseCallback');

        function promiseCallback() {
          let resolve, reject;
          function callback(err, ...args) {
            if (err) return reject(err)
            resolve(args.length > 1 ? args : args[0]);
          }

          callback[PROMISE_SYMBOL] = new Promise((res, rej) => {
            resolve = res,
              reject = rej;
          });

          return callback
        }

        /**
         * Determines the best order for running the {@link AsyncFunction}s in `tasks`, based on
         * their requirements. Each function can optionally depend on other functions
         * being completed first, and each function is run as soon as its requirements
         * are satisfied.
         *
         * If any of the {@link AsyncFunction}s pass an error to their callback, the `auto` sequence
         * will stop. Further tasks will not execute (so any other functions depending
         * on it will not run), and the main `callback` is immediately called with the
         * error.
         *
         * {@link AsyncFunction}s also receive an object containing the results of functions which
         * have completed so far as the first argument, if they have dependencies. If a
         * task function has no dependencies, it will only be passed a callback.
         *
         * @name auto
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {Object} tasks - An object. Each of its properties is either a
         * function or an array of requirements, with the {@link AsyncFunction} itself the last item
         * in the array. The object's key of a property serves as the name of the task
         * defined by that property, i.e. can be used when specifying requirements for
         * other tasks. The function receives one or two arguments:
         * * a `results` object, containing the results of the previously executed
         *   functions, only passed if the task has any dependencies,
         * * a `callback(err, result)` function, which must be called when finished,
         *   passing an `error` (which can be `null`) and the result of the function's
         *   execution.
         * @param {number} [concurrency=Infinity] - An optional `integer` for
         * determining the maximum number of tasks that can be run in parallel. By
         * default, as many as possible.
         * @param {Function} [callback] - An optional callback which is called when all
         * the tasks have been completed. It receives the `err` argument if any `tasks`
         * pass an error to their callback. Results are always returned; however, if an
         * error occurs, no further `tasks` will be performed, and the results object
         * will only contain partial results. Invoked with (err, results).
         * @returns {Promise} a promise, if a callback is not passed
         * @example
         *
         * //Using Callbacks
         * async.auto({
         *     get_data: function(callback) {
         *         // async code to get some data
         *         callback(null, 'data', 'converted to array');
         *     },
         *     make_folder: function(callback) {
         *         // async code to create a directory to store a file in
         *         // this is run at the same time as getting the data
         *         callback(null, 'folder');
         *     },
         *     write_file: ['get_data', 'make_folder', function(results, callback) {
         *         // once there is some data and the directory exists,
         *         // write the data to a file in the directory
         *         callback(null, 'filename');
         *     }],
         *     email_link: ['write_file', function(results, callback) {
         *         // once the file is written let's email a link to it...
         *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
         *     }]
         * }, function(err, results) {
         *     if (err) {
         *         console.log('err = ', err);
         *     }
         *     console.log('results = ', results);
         *     // results = {
         *     //     get_data: ['data', 'converted to array']
         *     //     make_folder; 'folder',
         *     //     write_file: 'filename'
         *     //     email_link: { file: 'filename', email: 'user@example.com' }
         *     // }
         * });
         *
         * //Using Promises
         * async.auto({
         *     get_data: function(callback) {
         *         console.log('in get_data');
         *         // async code to get some data
         *         callback(null, 'data', 'converted to array');
         *     },
         *     make_folder: function(callback) {
         *         console.log('in make_folder');
         *         // async code to create a directory to store a file in
         *         // this is run at the same time as getting the data
         *         callback(null, 'folder');
         *     },
         *     write_file: ['get_data', 'make_folder', function(results, callback) {
         *         // once there is some data and the directory exists,
         *         // write the data to a file in the directory
         *         callback(null, 'filename');
         *     }],
         *     email_link: ['write_file', function(results, callback) {
         *         // once the file is written let's email a link to it...
         *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
         *     }]
         * }).then(results => {
         *     console.log('results = ', results);
         *     // results = {
         *     //     get_data: ['data', 'converted to array']
         *     //     make_folder; 'folder',
         *     //     write_file: 'filename'
         *     //     email_link: { file: 'filename', email: 'user@example.com' }
         *     // }
         * }).catch(err => {
         *     console.log('err = ', err);
         * });
         *
         * //Using async/await
         * async () => {
         *     try {
         *         let results = await async.auto({
         *             get_data: function(callback) {
         *                 // async code to get some data
         *                 callback(null, 'data', 'converted to array');
         *             },
         *             make_folder: function(callback) {
         *                 // async code to create a directory to store a file in
         *                 // this is run at the same time as getting the data
         *                 callback(null, 'folder');
         *             },
         *             write_file: ['get_data', 'make_folder', function(results, callback) {
         *                 // once there is some data and the directory exists,
         *                 // write the data to a file in the directory
         *                 callback(null, 'filename');
         *             }],
         *             email_link: ['write_file', function(results, callback) {
         *                 // once the file is written let's email a link to it...
         *                 callback(null, {'file':results.write_file, 'email':'user@example.com'});
         *             }]
         *         });
         *         console.log('results = ', results);
         *         // results = {
         *         //     get_data: ['data', 'converted to array']
         *         //     make_folder; 'folder',
         *         //     write_file: 'filename'
         *         //     email_link: { file: 'filename', email: 'user@example.com' }
         *         // }
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function auto(tasks, concurrency, callback) {
          if (typeof concurrency !== 'number') {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
          }
          callback = once(callback || promiseCallback());
          var numTasks = Object.keys(tasks).length;
          if (!numTasks) {
            return callback(null);
          }
          if (!concurrency) {
            concurrency = numTasks;
          }

          var results = {};
          var runningTasks = 0;
          var canceled = false;
          var hasError = false;

          var listeners = Object.create(null);

          var readyTasks = [];

          // for cycle detection:
          var readyToCheck = []; // tasks that have been identified as reachable
          // without the possibility of returning to an ancestor task
          var uncheckedDependencies = {};

          Object.keys(tasks).forEach(key => {
            var task = tasks[key];
            if (!Array.isArray(task)) {
              // no dependencies
              enqueueTask(key, [task]);
              readyToCheck.push(key);
              return;
            }

            var dependencies = task.slice(0, task.length - 1);
            var remainingDependencies = dependencies.length;
            if (remainingDependencies === 0) {
              enqueueTask(key, task);
              readyToCheck.push(key);
              return;
            }
            uncheckedDependencies[key] = remainingDependencies;

            dependencies.forEach(dependencyName => {
              if (!tasks[dependencyName]) {
                throw new Error('async.auto task `' + key +
                  '` has a non-existent dependency `' +
                  dependencyName + '` in ' +
                  dependencies.join(', '));
              }
              addListener(dependencyName, () => {
                remainingDependencies--;
                if (remainingDependencies === 0) {
                  enqueueTask(key, task);
                }
              });
            });
          });

          checkForDeadlocks();
          processQueue();

          function enqueueTask(key, task) {
            readyTasks.push(() => runTask(key, task));
          }

          function processQueue() {
            if (canceled) return
            if (readyTasks.length === 0 && runningTasks === 0) {
              return callback(null, results);
            }
            while (readyTasks.length && runningTasks < concurrency) {
              var run = readyTasks.shift();
              run();
            }

          }

          function addListener(taskName, fn) {
            var taskListeners = listeners[taskName];
            if (!taskListeners) {
              taskListeners = listeners[taskName] = [];
            }

            taskListeners.push(fn);
          }

          function taskComplete(taskName) {
            var taskListeners = listeners[taskName] || [];
            taskListeners.forEach(fn => fn());
            processQueue();
          }


          function runTask(key, task) {
            if (hasError) return;

            var taskCallback = onlyOnce((err, ...result) => {
              runningTasks--;
              if (err === false) {
                canceled = true;
                return
              }
              if (result.length < 2) {
                [result] = result;
              }
              if (err) {
                var safeResults = {};
                Object.keys(results).forEach(rkey => {
                  safeResults[rkey] = results[rkey];
                });
                safeResults[key] = result;
                hasError = true;
                listeners = Object.create(null);
                if (canceled) return
                callback(err, safeResults);
              } else {
                results[key] = result;
                taskComplete(key);
              }
            });

            runningTasks++;
            var taskFn = wrapAsync(task[task.length - 1]);
            if (task.length > 1) {
              taskFn(results, taskCallback);
            } else {
              taskFn(taskCallback);
            }
          }

          function checkForDeadlocks() {
            // Kahn's algorithm
            // https://en.wikipedia.org/wiki/Topological_sorting#Kahn.27s_algorithm
            // http://connalle.blogspot.com/2013/10/topological-sortingkahn-algorithm.html
            var currentTask;
            var counter = 0;
            while (readyToCheck.length) {
              currentTask = readyToCheck.pop();
              counter++;
              getDependents(currentTask).forEach(dependent => {
                if (--uncheckedDependencies[dependent] === 0) {
                  readyToCheck.push(dependent);
                }
              });
            }

            if (counter !== numTasks) {
              throw new Error(
                'async.auto cannot execute tasks due to a recursive dependency'
              );
            }
          }

          function getDependents(taskName) {
            var result = [];
            Object.keys(tasks).forEach(key => {
              const task = tasks[key];
              if (Array.isArray(task) && task.indexOf(taskName) >= 0) {
                result.push(key);
              }
            });
            return result;
          }

          return callback[PROMISE_SYMBOL]
        }

        var FN_ARGS = /^(?:async\s+)?(?:function)?\s*\w*\s*\(\s*([^)]+)\s*\)(?:\s*{)/;
        var ARROW_FN_ARGS = /^(?:async\s+)?\(?\s*([^)=]+)\s*\)?(?:\s*=>)/;
        var FN_ARG_SPLIT = /,/;
        var FN_ARG = /(=.+)?(\s*)$/;

        function stripComments(string) {
          let stripped = '';
          let index = 0;
          let endBlockComment = string.indexOf('*/');
          while (index < string.length) {
            if (string[index] === '/' && string[index + 1] === '/') {
              // inline comment
              let endIndex = string.indexOf('\n', index);
              index = (endIndex === -1) ? string.length : endIndex;
            } else if ((endBlockComment !== -1) && (string[index] === '/') && (string[index + 1] === '*')) {
              // block comment
              let endIndex = string.indexOf('*/', index);
              if (endIndex !== -1) {
                index = endIndex + 2;
                endBlockComment = string.indexOf('*/', index);
              } else {
                stripped += string[index];
                index++;
              }
            } else {
              stripped += string[index];
              index++;
            }
          }
          return stripped;
        }

        function parseParams(func) {
          const src = stripComments(func.toString());
          let match = src.match(FN_ARGS);
          if (!match) {
            match = src.match(ARROW_FN_ARGS);
          }
          if (!match) throw new Error('could not parse args in autoInject\nSource:\n' + src)
          let [, args] = match;
          return args
            .replace(/\s/g, '')
            .split(FN_ARG_SPLIT)
            .map((arg) => arg.replace(FN_ARG, '').trim());
        }

        /**
         * A dependency-injected version of the [async.auto]{@link module:ControlFlow.auto} function. Dependent
         * tasks are specified as parameters to the function, after the usual callback
         * parameter, with the parameter names matching the names of the tasks it
         * depends on. This can provide even more readable task graphs which can be
         * easier to maintain.
         *
         * If a final callback is specified, the task results are similarly injected,
         * specified as named parameters after the initial error parameter.
         *
         * The autoInject function is purely syntactic sugar and its semantics are
         * otherwise equivalent to [async.auto]{@link module:ControlFlow.auto}.
         *
         * @name autoInject
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.auto]{@link module:ControlFlow.auto}
         * @category Control Flow
         * @param {Object} tasks - An object, each of whose properties is an {@link AsyncFunction} of
         * the form 'func([dependencies...], callback). The object's key of a property
         * serves as the name of the task defined by that property, i.e. can be used
         * when specifying requirements for other tasks.
         * * The `callback` parameter is a `callback(err, result)` which must be called
         *   when finished, passing an `error` (which can be `null`) and the result of
         *   the function's execution. The remaining parameters name other tasks on
         *   which the task is dependent, and the results from those tasks are the
         *   arguments of those parameters.
         * @param {Function} [callback] - An optional callback which is called when all
         * the tasks have been completed. It receives the `err` argument if any `tasks`
         * pass an error to their callback, and a `results` object with any completed
         * task results, similar to `auto`.
         * @returns {Promise} a promise, if no callback is passed
         * @example
         *
         * //  The example from `auto` can be rewritten as follows:
         * async.autoInject({
         *     get_data: function(callback) {
         *         // async code to get some data
         *         callback(null, 'data', 'converted to array');
         *     },
         *     make_folder: function(callback) {
         *         // async code to create a directory to store a file in
         *         // this is run at the same time as getting the data
         *         callback(null, 'folder');
         *     },
         *     write_file: function(get_data, make_folder, callback) {
         *         // once there is some data and the directory exists,
         *         // write the data to a file in the directory
         *         callback(null, 'filename');
         *     },
         *     email_link: function(write_file, callback) {
         *         // once the file is written let's email a link to it...
         *         // write_file contains the filename returned by write_file.
         *         callback(null, {'file':write_file, 'email':'user@example.com'});
         *     }
         * }, function(err, results) {
         *     console.log('err = ', err);
         *     console.log('email_link = ', results.email_link);
         * });
         *
         * // If you are using a JS minifier that mangles parameter names, `autoInject`
         * // will not work with plain functions, since the parameter names will be
         * // collapsed to a single letter identifier.  To work around this, you can
         * // explicitly specify the names of the parameters your task function needs
         * // in an array, similar to Angular.js dependency injection.
         *
         * // This still has an advantage over plain `auto`, since the results a task
         * // depends on are still spread into arguments.
         * async.autoInject({
         *     //...
         *     write_file: ['get_data', 'make_folder', function(get_data, make_folder, callback) {
         *         callback(null, 'filename');
         *     }],
         *     email_link: ['write_file', function(write_file, callback) {
         *         callback(null, {'file':write_file, 'email':'user@example.com'});
         *     }]
         *     //...
         * }, function(err, results) {
         *     console.log('err = ', err);
         *     console.log('email_link = ', results.email_link);
         * });
         */
        function autoInject(tasks, callback) {
          var newTasks = {};

          Object.keys(tasks).forEach(key => {
            var taskFn = tasks[key];
            var params;
            var fnIsAsync = isAsync(taskFn);
            var hasNoDeps =
              (!fnIsAsync && taskFn.length === 1) ||
              (fnIsAsync && taskFn.length === 0);

            if (Array.isArray(taskFn)) {
              params = [...taskFn];
              taskFn = params.pop();

              newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
            } else if (hasNoDeps) {
              // no dependencies, use the function as-is
              newTasks[key] = taskFn;
            } else {
              params = parseParams(taskFn);
              if ((taskFn.length === 0 && !fnIsAsync) && params.length === 0) {
                throw new Error("autoInject task functions require explicit parameters.");
              }

              // remove callback param
              if (!fnIsAsync) params.pop();

              newTasks[key] = params.concat(newTask);
            }

            function newTask(results, taskCb) {
              var newArgs = params.map(name => results[name]);
              newArgs.push(taskCb);
              wrapAsync(taskFn)(...newArgs);
            }
          });

          return auto(newTasks, callback);
        }

        // Simple doubly linked list (https://en.wikipedia.org/wiki/Doubly_linked_list) implementation
        // used for queues. This implementation assumes that the node provided by the user can be modified
        // to adjust the next and last properties. We implement only the minimal functionality
        // for queue support.
        class DLL {
          constructor() {
            this.head = this.tail = null;
            this.length = 0;
          }

          removeLink(node) {
            if (node.prev) node.prev.next = node.next;
            else this.head = node.next;
            if (node.next) node.next.prev = node.prev;
            else this.tail = node.prev;

            node.prev = node.next = null;
            this.length -= 1;
            return node;
          }

          empty() {
            while (this.head) this.shift();
            return this;
          }

          insertAfter(node, newNode) {
            newNode.prev = node;
            newNode.next = node.next;
            if (node.next) node.next.prev = newNode;
            else this.tail = newNode;
            node.next = newNode;
            this.length += 1;
          }

          insertBefore(node, newNode) {
            newNode.prev = node.prev;
            newNode.next = node;
            if (node.prev) node.prev.next = newNode;
            else this.head = newNode;
            node.prev = newNode;
            this.length += 1;
          }

          unshift(node) {
            if (this.head) this.insertBefore(this.head, node);
            else setInitial(this, node);
          }

          push(node) {
            if (this.tail) this.insertAfter(this.tail, node);
            else setInitial(this, node);
          }

          shift() {
            return this.head && this.removeLink(this.head);
          }

          pop() {
            return this.tail && this.removeLink(this.tail);
          }

          toArray() {
            return [...this]
          }

          *[Symbol.iterator]() {
            var cur = this.head;
            while (cur) {
              yield cur.data;
              cur = cur.next;
            }
          }

          remove(testFn) {
            var curr = this.head;
            while (curr) {
              var { next } = curr;
              if (testFn(curr)) {
                this.removeLink(curr);
              }
              curr = next;
            }
            return this;
          }
        }

        function setInitial(dll, node) {
          dll.length = 1;
          dll.head = dll.tail = node;
        }

        function queue(worker, concurrency, payload) {
          if (concurrency == null) {
            concurrency = 1;
          }
          else if (concurrency === 0) {
            throw new RangeError('Concurrency must not be zero');
          }

          var _worker = wrapAsync(worker);
          var numRunning = 0;
          var workersList = [];
          const events = {
            error: [],
            drain: [],
            saturated: [],
            unsaturated: [],
            empty: []
          };

          function on(event, handler) {
            events[event].push(handler);
          }

          function once(event, handler) {
            const handleAndRemove = (...args) => {
              off(event, handleAndRemove);
              handler(...args);
            };
            events[event].push(handleAndRemove);
          }

          function off(event, handler) {
            if (!event) return Object.keys(events).forEach(ev => events[ev] = [])
            if (!handler) return events[event] = []
            events[event] = events[event].filter(ev => ev !== handler);
          }

          function trigger(event, ...args) {
            events[event].forEach(handler => handler(...args));
          }

          var processingScheduled = false;
          function _insert(data, insertAtFront, rejectOnError, callback) {
            if (callback != null && typeof callback !== 'function') {
              throw new Error('task callback must be a function');
            }
            q.started = true;

            var res, rej;
            function promiseCallback(err, ...args) {
              // we don't care about the error, let the global error handler
              // deal with it
              if (err) return rejectOnError ? rej(err) : res()
              if (args.length <= 1) return res(args[0])
              res(args);
            }

            var item = q._createTaskItem(
              data,
              rejectOnError ? promiseCallback :
                (callback || promiseCallback)
            );

            if (insertAtFront) {
              q._tasks.unshift(item);
            } else {
              q._tasks.push(item);
            }

            if (!processingScheduled) {
              processingScheduled = true;
              setImmediate$1(() => {
                processingScheduled = false;
                q.process();
              });
            }

            if (rejectOnError || !callback) {
              return new Promise((resolve, reject) => {
                res = resolve;
                rej = reject;
              })
            }
          }

          function _createCB(tasks) {
            return function (err, ...args) {
              numRunning -= 1;

              for (var i = 0, l = tasks.length; i < l; i++) {
                var task = tasks[i];

                var index = workersList.indexOf(task);
                if (index === 0) {
                  workersList.shift();
                } else if (index > 0) {
                  workersList.splice(index, 1);
                }

                task.callback(err, ...args);

                if (err != null) {
                  trigger('error', err, task.data);
                }
              }

              if (numRunning <= (q.concurrency - q.buffer)) {
                trigger('unsaturated');
              }

              if (q.idle()) {
                trigger('drain');
              }
              q.process();
            };
          }

          function _maybeDrain(data) {
            if (data.length === 0 && q.idle()) {
              // call drain immediately if there are no tasks
              setImmediate$1(() => trigger('drain'));
              return true
            }
            return false
          }

          const eventMethod = (name) => (handler) => {
            if (!handler) {
              return new Promise((resolve, reject) => {
                once(name, (err, data) => {
                  if (err) return reject(err)
                  resolve(data);
                });
              })
            }
            off(name);
            on(name, handler);

          };

          var isProcessing = false;
          var q = {
            _tasks: new DLL(),
            _createTaskItem(data, callback) {
              return {
                data,
                callback
              };
            },
            *[Symbol.iterator]() {
              yield* q._tasks[Symbol.iterator]();
            },
            concurrency,
            payload,
            buffer: concurrency / 4,
            started: false,
            paused: false,
            push(data, callback) {
              if (Array.isArray(data)) {
                if (_maybeDrain(data)) return
                return data.map(datum => _insert(datum, false, false, callback))
              }
              return _insert(data, false, false, callback);
            },
            pushAsync(data, callback) {
              if (Array.isArray(data)) {
                if (_maybeDrain(data)) return
                return data.map(datum => _insert(datum, false, true, callback))
              }
              return _insert(data, false, true, callback);
            },
            kill() {
              off();
              q._tasks.empty();
            },
            unshift(data, callback) {
              if (Array.isArray(data)) {
                if (_maybeDrain(data)) return
                return data.map(datum => _insert(datum, true, false, callback))
              }
              return _insert(data, true, false, callback);
            },
            unshiftAsync(data, callback) {
              if (Array.isArray(data)) {
                if (_maybeDrain(data)) return
                return data.map(datum => _insert(datum, true, true, callback))
              }
              return _insert(data, true, true, callback);
            },
            remove(testFn) {
              q._tasks.remove(testFn);
            },
            process() {
              // Avoid trying to start too many processing operations. This can occur
              // when callbacks resolve synchronously (#1267).
              if (isProcessing) {
                return;
              }
              isProcessing = true;
              while (!q.paused && numRunning < q.concurrency && q._tasks.length) {
                var tasks = [], data = [];
                var l = q._tasks.length;
                if (q.payload) l = Math.min(l, q.payload);
                for (var i = 0; i < l; i++) {
                  var node = q._tasks.shift();
                  tasks.push(node);
                  workersList.push(node);
                  data.push(node.data);
                }

                numRunning += 1;

                if (q._tasks.length === 0) {
                  trigger('empty');
                }

                if (numRunning === q.concurrency) {
                  trigger('saturated');
                }

                var cb = onlyOnce(_createCB(tasks));
                _worker(data, cb);
              }
              isProcessing = false;
            },
            length() {
              return q._tasks.length;
            },
            running() {
              return numRunning;
            },
            workersList() {
              return workersList;
            },
            idle() {
              return q._tasks.length + numRunning === 0;
            },
            pause() {
              q.paused = true;
            },
            resume() {
              if (q.paused === false) { return; }
              q.paused = false;
              setImmediate$1(q.process);
            }
          };
          // define these as fixed properties, so people get useful errors when updating
          Object.defineProperties(q, {
            saturated: {
              writable: false,
              value: eventMethod('saturated')
            },
            unsaturated: {
              writable: false,
              value: eventMethod('unsaturated')
            },
            empty: {
              writable: false,
              value: eventMethod('empty')
            },
            drain: {
              writable: false,
              value: eventMethod('drain')
            },
            error: {
              writable: false,
              value: eventMethod('error')
            },
          });
          return q;
        }

        /**
         * Creates a `cargo` object with the specified payload. Tasks added to the
         * cargo will be processed altogether (up to the `payload` limit). If the
         * `worker` is in progress, the task is queued until it becomes available. Once
         * the `worker` has completed some tasks, each callback of those tasks is
         * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
         * for how `cargo` and `queue` work.
         *
         * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
         * at a time, cargo passes an array of tasks to a single worker, repeating
         * when the worker is finished.
         *
         * @name cargo
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.queue]{@link module:ControlFlow.queue}
         * @category Control Flow
         * @param {AsyncFunction} worker - An asynchronous function for processing an array
         * of queued tasks. Invoked with `(tasks, callback)`.
         * @param {number} [payload=Infinity] - An optional `integer` for determining
         * how many tasks should be processed per round; if omitted, the default is
         * unlimited.
         * @returns {module:ControlFlow.QueueObject} A cargo object to manage the tasks. Callbacks can
         * attached as certain properties to listen for specific events during the
         * lifecycle of the cargo and inner queue.
         * @example
         *
         * // create a cargo object with payload 2
         * var cargo = async.cargo(function(tasks, callback) {
         *     for (var i=0; i<tasks.length; i++) {
         *         console.log('hello ' + tasks[i].name);
         *     }
         *     callback();
         * }, 2);
         *
         * // add some items
         * cargo.push({name: 'foo'}, function(err) {
         *     console.log('finished processing foo');
         * });
         * cargo.push({name: 'bar'}, function(err) {
         *     console.log('finished processing bar');
         * });
         * await cargo.push({name: 'baz'});
         * console.log('finished processing baz');
         */
        function cargo(worker, payload) {
          return queue(worker, 1, payload);
        }

        /**
         * Creates a `cargoQueue` object with the specified payload. Tasks added to the
         * cargoQueue will be processed together (up to the `payload` limit) in `concurrency` parallel workers.
         * If the all `workers` are in progress, the task is queued until one becomes available. Once
         * a `worker` has completed some tasks, each callback of those tasks is
         * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
         * for how `cargo` and `queue` work.
         *
         * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
         * at a time, and [`cargo`]{@link module:ControlFlow.cargo} passes an array of tasks to a single worker,
         * the cargoQueue passes an array of tasks to multiple parallel workers.
         *
         * @name cargoQueue
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.queue]{@link module:ControlFlow.queue}
         * @see [async.cargo]{@link module:ControlFLow.cargo}
         * @category Control Flow
         * @param {AsyncFunction} worker - An asynchronous function for processing an array
         * of queued tasks. Invoked with `(tasks, callback)`.
         * @param {number} [concurrency=1] - An `integer` for determining how many
         * `worker` functions should be run in parallel.  If omitted, the concurrency
         * defaults to `1`.  If the concurrency is `0`, an error is thrown.
         * @param {number} [payload=Infinity] - An optional `integer` for determining
         * how many tasks should be processed per round; if omitted, the default is
         * unlimited.
         * @returns {module:ControlFlow.QueueObject} A cargoQueue object to manage the tasks. Callbacks can
         * attached as certain properties to listen for specific events during the
         * lifecycle of the cargoQueue and inner queue.
         * @example
         *
         * // create a cargoQueue object with payload 2 and concurrency 2
         * var cargoQueue = async.cargoQueue(function(tasks, callback) {
         *     for (var i=0; i<tasks.length; i++) {
         *         console.log('hello ' + tasks[i].name);
         *     }
         *     callback();
         * }, 2, 2);
         *
         * // add some items
         * cargoQueue.push({name: 'foo'}, function(err) {
         *     console.log('finished processing foo');
         * });
         * cargoQueue.push({name: 'bar'}, function(err) {
         *     console.log('finished processing bar');
         * });
         * cargoQueue.push({name: 'baz'}, function(err) {
         *     console.log('finished processing baz');
         * });
         * cargoQueue.push({name: 'boo'}, function(err) {
         *     console.log('finished processing boo');
         * });
         */
        function cargo$1(worker, concurrency, payload) {
          return queue(worker, concurrency, payload);
        }

        /**
         * Reduces `coll` into a single value using an async `iteratee` to return each
         * successive step. `memo` is the initial state of the reduction. This function
         * only operates in series.
         *
         * For performance reasons, it may make sense to split a call to this function
         * into a parallel map, and then use the normal `Array.prototype.reduce` on the
         * results. This function is for situations where each step in the reduction
         * needs to be async; if you can get the data before reducing it, then it's
         * probably a good idea to do so.
         *
         * @name reduce
         * @static
         * @memberOf module:Collections
         * @method
         * @alias inject
         * @alias foldl
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {*} memo - The initial state of the reduction.
         * @param {AsyncFunction} iteratee - A function applied to each item in the
         * array to produce the next step in the reduction.
         * The `iteratee` should complete with the next state of the reduction.
         * If the iteratee completes with an error, the reduction is stopped and the
         * main `callback` is immediately called with the error.
         * Invoked with (memo, item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Result is the reduced value. Invoked with
         * (err, result).
         * @returns {Promise} a promise, if no callback is passed
         * @example
         *
         * // file1.txt is a file that is 1000 bytes in size
         * // file2.txt is a file that is 2000 bytes in size
         * // file3.txt is a file that is 3000 bytes in size
         * // file4.txt does not exist
         *
         * const fileList = ['file1.txt','file2.txt','file3.txt'];
         * const withMissingFileList = ['file1.txt','file2.txt','file3.txt', 'file4.txt'];
         *
         * // asynchronous function that computes the file size in bytes
         * // file size is added to the memoized value, then returned
         * function getFileSizeInBytes(memo, file, callback) {
         *     fs.stat(file, function(err, stat) {
         *         if (err) {
         *             return callback(err);
         *         }
         *         callback(null, memo + stat.size);
         *     });
         * }
         *
         * // Using callbacks
         * async.reduce(fileList, 0, getFileSizeInBytes, function(err, result) {
         *     if (err) {
         *         console.log(err);
         *     } else {
         *         console.log(result);
         *         // 6000
         *         // which is the sum of the file sizes of the three files
         *     }
         * });
         *
         * // Error Handling
         * async.reduce(withMissingFileList, 0, getFileSizeInBytes, function(err, result) {
         *     if (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *     } else {
         *         console.log(result);
         *     }
         * });
         *
         * // Using Promises
         * async.reduce(fileList, 0, getFileSizeInBytes)
         * .then( result => {
         *     console.log(result);
         *     // 6000
         *     // which is the sum of the file sizes of the three files
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * // Error Handling
         * async.reduce(withMissingFileList, 0, getFileSizeInBytes)
         * .then( result => {
         *     console.log(result);
         * }).catch( err => {
         *     console.log(err);
         *     // [ Error: ENOENT: no such file or directory ]
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let result = await async.reduce(fileList, 0, getFileSizeInBytes);
         *         console.log(result);
         *         // 6000
         *         // which is the sum of the file sizes of the three files
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * // Error Handling
         * async () => {
         *     try {
         *         let result = await async.reduce(withMissingFileList, 0, getFileSizeInBytes);
         *         console.log(result);
         *     }
         *     catch (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *     }
         * }
         *
         */
        function reduce(coll, memo, iteratee, callback) {
          callback = once(callback);
          var _iteratee = wrapAsync(iteratee);
          return eachOfSeries$1(coll, (x, i, iterCb) => {
            _iteratee(memo, x, (err, v) => {
              memo = v;
              iterCb(err);
            });
          }, err => callback(err, memo));
        }
        var reduce$1 = awaitify(reduce, 4);

        /**
         * Version of the compose function that is more natural to read. Each function
         * consumes the return value of the previous function. It is the equivalent of
         * [compose]{@link module:ControlFlow.compose} with the arguments reversed.
         *
         * Each function is executed with the `this` binding of the composed function.
         *
         * @name seq
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.compose]{@link module:ControlFlow.compose}
         * @category Control Flow
         * @param {...AsyncFunction} functions - the asynchronous functions to compose
         * @returns {Function} a function that composes the `functions` in order
         * @example
         *
         * // Requires lodash (or underscore), express3 and dresende's orm2.
         * // Part of an app, that fetches cats of the logged user.
         * // This example uses `seq` function to avoid overnesting and error
         * // handling clutter.
         * app.get('/cats', function(request, response) {
         *     var User = request.models.User;
         *     async.seq(
         *         User.get.bind(User),  // 'User.get' has signature (id, callback(err, data))
         *         function(user, fn) {
         *             user.getCats(fn);      // 'getCats' has signature (callback(err, data))
         *         }
         *     )(req.session.user_id, function (err, cats) {
         *         if (err) {
         *             console.error(err);
         *             response.json({ status: 'error', message: err.message });
         *         } else {
         *             response.json({ status: 'ok', message: 'Cats found', data: cats });
         *         }
         *     });
         * });
         */
        function seq(...functions) {
          var _functions = functions.map(wrapAsync);
          return function (...args) {
            var that = this;

            var cb = args[args.length - 1];
            if (typeof cb == 'function') {
              args.pop();
            } else {
              cb = promiseCallback();
            }

            reduce$1(_functions, args, (newargs, fn, iterCb) => {
              fn.apply(that, newargs.concat((err, ...nextargs) => {
                iterCb(err, nextargs);
              }));
            },
              (err, results) => cb(err, ...results));

            return cb[PROMISE_SYMBOL]
          };
        }

        /**
         * Creates a function which is a composition of the passed asynchronous
         * functions. Each function consumes the return value of the function that
         * follows. Composing functions `f()`, `g()`, and `h()` would produce the result
         * of `f(g(h()))`, only this version uses callbacks to obtain the return values.
         *
         * If the last argument to the composed function is not a function, a promise
         * is returned when you call it.
         *
         * Each function is executed with the `this` binding of the composed function.
         *
         * @name compose
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {...AsyncFunction} functions - the asynchronous functions to compose
         * @returns {Function} an asynchronous function that is the composed
         * asynchronous `functions`
         * @example
         *
         * function add1(n, callback) {
         *     setTimeout(function () {
         *         callback(null, n + 1);
         *     }, 10);
         * }
         *
         * function mul3(n, callback) {
         *     setTimeout(function () {
         *         callback(null, n * 3);
         *     }, 10);
         * }
         *
         * var add1mul3 = async.compose(mul3, add1);
         * add1mul3(4, function (err, result) {
         *     // result now equals 15
         * });
         */
        function compose(...args) {
          return seq(...args.reverse());
        }

        /**
         * The same as [`map`]{@link module:Collections.map} but runs a maximum of `limit` async operations at a time.
         *
         * @name mapLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.map]{@link module:Collections.map}
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * The iteratee should complete with the transformed item.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. Results is an array of the
         * transformed items from the `coll`. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback is passed
         */
        function mapLimit(coll, limit, iteratee, callback) {
          return _asyncMap(eachOfLimit(limit), coll, iteratee, callback)
        }
        var mapLimit$1 = awaitify(mapLimit, 4);

        /**
         * The same as [`concat`]{@link module:Collections.concat} but runs a maximum of `limit` async operations at a time.
         *
         * @name concatLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.concat]{@link module:Collections.concat}
         * @category Collection
         * @alias flatMapLimit
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
         * which should use an array as its result. Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished, or an error occurs. Results is an array
         * containing the concatenated results of the `iteratee` function. Invoked with
         * (err, results).
         * @returns A Promise, if no callback is passed
         */
        function concatLimit(coll, limit, iteratee, callback) {
          var _iteratee = wrapAsync(iteratee);
          return mapLimit$1(coll, limit, (val, iterCb) => {
            _iteratee(val, (err, ...args) => {
              if (err) return iterCb(err);
              return iterCb(err, args);
            });
          }, (err, mapResults) => {
            var result = [];
            for (var i = 0; i < mapResults.length; i++) {
              if (mapResults[i]) {
                result = result.concat(...mapResults[i]);
              }
            }

            return callback(err, result);
          });
        }
        var concatLimit$1 = awaitify(concatLimit, 4);

        /**
         * Applies `iteratee` to each item in `coll`, concatenating the results. Returns
         * the concatenated list. The `iteratee`s are called in parallel, and the
         * results are concatenated as they return. The results array will be returned in
         * the original order of `coll` passed to the `iteratee` function.
         *
         * @name concat
         * @static
         * @memberOf module:Collections
         * @method
         * @category Collection
         * @alias flatMap
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
         * which should use an array as its result. Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished, or an error occurs. Results is an array
         * containing the concatenated results of the `iteratee` function. Invoked with
         * (err, results).
         * @returns A Promise, if no callback is passed
         * @example
         *
         * // dir1 is a directory that contains file1.txt, file2.txt
         * // dir2 is a directory that contains file3.txt, file4.txt
         * // dir3 is a directory that contains file5.txt
         * // dir4 does not exist
         *
         * let directoryList = ['dir1','dir2','dir3'];
         * let withMissingDirectoryList = ['dir1','dir2','dir3', 'dir4'];
         *
         * // Using callbacks
         * async.concat(directoryList, fs.readdir, function(err, results) {
         *    if (err) {
         *        console.log(err);
         *    } else {
         *        console.log(results);
         *        // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
         *    }
         * });
         *
         * // Error Handling
         * async.concat(withMissingDirectoryList, fs.readdir, function(err, results) {
         *    if (err) {
         *        console.log(err);
         *        // [ Error: ENOENT: no such file or directory ]
         *        // since dir4 does not exist
         *    } else {
         *        console.log(results);
         *    }
         * });
         *
         * // Using Promises
         * async.concat(directoryList, fs.readdir)
         * .then(results => {
         *     console.log(results);
         *     // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
         * }).catch(err => {
         *      console.log(err);
         * });
         *
         * // Error Handling
         * async.concat(withMissingDirectoryList, fs.readdir)
         * .then(results => {
         *     console.log(results);
         * }).catch(err => {
         *     console.log(err);
         *     // [ Error: ENOENT: no such file or directory ]
         *     // since dir4 does not exist
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let results = await async.concat(directoryList, fs.readdir);
         *         console.log(results);
         *         // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
         *     } catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * // Error Handling
         * async () => {
         *     try {
         *         let results = await async.concat(withMissingDirectoryList, fs.readdir);
         *         console.log(results);
         *     } catch (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *         // since dir4 does not exist
         *     }
         * }
         *
         */
        function concat(coll, iteratee, callback) {
          return concatLimit$1(coll, Infinity, iteratee, callback)
        }
        var concat$1 = awaitify(concat, 3);

        /**
         * The same as [`concat`]{@link module:Collections.concat} but runs only a single async operation at a time.
         *
         * @name concatSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.concat]{@link module:Collections.concat}
         * @category Collection
         * @alias flatMapSeries
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`.
         * The iteratee should complete with an array an array of results.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished, or an error occurs. Results is an array
         * containing the concatenated results of the `iteratee` function. Invoked with
         * (err, results).
         * @returns A Promise, if no callback is passed
         */
        function concatSeries(coll, iteratee, callback) {
          return concatLimit$1(coll, 1, iteratee, callback)
        }
        var concatSeries$1 = awaitify(concatSeries, 3);

        /**
         * Returns a function that when called, calls-back with the values provided.
         * Useful as the first function in a [`waterfall`]{@link module:ControlFlow.waterfall}, or for plugging values in to
         * [`auto`]{@link module:ControlFlow.auto}.
         *
         * @name constant
         * @static
         * @memberOf module:Utils
         * @method
         * @category Util
         * @param {...*} arguments... - Any number of arguments to automatically invoke
         * callback with.
         * @returns {AsyncFunction} Returns a function that when invoked, automatically
         * invokes the callback with the previous given arguments.
         * @example
         *
         * async.waterfall([
         *     async.constant(42),
         *     function (value, next) {
         *         // value === 42
         *     },
         *     //...
         * ], callback);
         *
         * async.waterfall([
         *     async.constant(filename, "utf8"),
         *     fs.readFile,
         *     function (fileData, next) {
         *         //...
         *     }
         *     //...
         * ], callback);
         *
         * async.auto({
         *     hostname: async.constant("https://server.net/"),
         *     port: findFreePort,
         *     launchServer: ["hostname", "port", function (options, cb) {
         *         startServer(options, cb);
         *     }],
         *     //...
         * }, callback);
         */
        function constant(...args) {
          return function (...ignoredArgs/*, callback*/) {
            var callback = ignoredArgs.pop();
            return callback(null, ...args);
          };
        }

        function _createTester(check, getResult) {
          return (eachfn, arr, _iteratee, cb) => {
            var testPassed = false;
            var testResult;
            const iteratee = wrapAsync(_iteratee);
            eachfn(arr, (value, _, callback) => {
              iteratee(value, (err, result) => {
                if (err || err === false) return callback(err);

                if (check(result) && !testResult) {
                  testPassed = true;
                  testResult = getResult(true, value);
                  return callback(null, breakLoop);
                }
                callback();
              });
            }, err => {
              if (err) return cb(err);
              cb(null, testPassed ? testResult : getResult(false));
            });
          };
        }

        /**
         * Returns the first value in `coll` that passes an async truth test. The
         * `iteratee` is applied in parallel, meaning the first iteratee to return
         * `true` will fire the detect `callback` with that result. That means the
         * result might not be the first item in the original `coll` (in terms of order)
         * that passes the test.
        
         * If order within the original `coll` is important, then look at
         * [`detectSeries`]{@link module:Collections.detectSeries}.
         *
         * @name detect
         * @static
         * @memberOf module:Collections
         * @method
         * @alias find
         * @category Collections
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
         * The iteratee must complete with a boolean value as its result.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called as soon as any
         * iteratee returns `true`, or after all the `iteratee` functions have finished.
         * Result will be the first item in the array that passes the truth test
         * (iteratee) or the value `undefined` if none passed. Invoked with
         * (err, result).
         * @returns {Promise} a promise, if a callback is omitted
         * @example
         *
         * // dir1 is a directory that contains file1.txt, file2.txt
         * // dir2 is a directory that contains file3.txt, file4.txt
         * // dir3 is a directory that contains file5.txt
         *
         * // asynchronous function that checks if a file exists
         * function fileExists(file, callback) {
         *    fs.access(file, fs.constants.F_OK, (err) => {
         *        callback(null, !err);
         *    });
         * }
         *
         * async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists,
         *    function(err, result) {
         *        console.log(result);
         *        // dir1/file1.txt
         *        // result now equals the first file in the list that exists
         *    }
         *);
         *
         * // Using Promises
         * async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists)
         * .then(result => {
         *     console.log(result);
         *     // dir1/file1.txt
         *     // result now equals the first file in the list that exists
         * }).catch(err => {
         *     console.log(err);
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let result = await async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists);
         *         console.log(result);
         *         // dir1/file1.txt
         *         // result now equals the file in the list that exists
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function detect(coll, iteratee, callback) {
          return _createTester(bool => bool, (res, item) => item)(eachOf$1, coll, iteratee, callback)
        }
        var detect$1 = awaitify(detect, 3);

        /**
         * The same as [`detect`]{@link module:Collections.detect} but runs a maximum of `limit` async operations at a
         * time.
         *
         * @name detectLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.detect]{@link module:Collections.detect}
         * @alias findLimit
         * @category Collections
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
         * The iteratee must complete with a boolean value as its result.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called as soon as any
         * iteratee returns `true`, or after all the `iteratee` functions have finished.
         * Result will be the first item in the array that passes the truth test
         * (iteratee) or the value `undefined` if none passed. Invoked with
         * (err, result).
         * @returns {Promise} a promise, if a callback is omitted
         */
        function detectLimit(coll, limit, iteratee, callback) {
          return _createTester(bool => bool, (res, item) => item)(eachOfLimit(limit), coll, iteratee, callback)
        }
        var detectLimit$1 = awaitify(detectLimit, 4);

        /**
         * The same as [`detect`]{@link module:Collections.detect} but runs only a single async operation at a time.
         *
         * @name detectSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.detect]{@link module:Collections.detect}
         * @alias findSeries
         * @category Collections
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
         * The iteratee must complete with a boolean value as its result.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called as soon as any
         * iteratee returns `true`, or after all the `iteratee` functions have finished.
         * Result will be the first item in the array that passes the truth test
         * (iteratee) or the value `undefined` if none passed. Invoked with
         * (err, result).
         * @returns {Promise} a promise, if a callback is omitted
         */
        function detectSeries(coll, iteratee, callback) {
          return _createTester(bool => bool, (res, item) => item)(eachOfLimit(1), coll, iteratee, callback)
        }

        var detectSeries$1 = awaitify(detectSeries, 3);

        function consoleFunc(name) {
          return (fn, ...args) => wrapAsync(fn)(...args, (err, ...resultArgs) => {
            /* istanbul ignore else */
            if (typeof console === 'object') {
              /* istanbul ignore else */
              if (err) {
                /* istanbul ignore else */
                if (console.error) {
                  console.error(err);
                }
              } else if (console[name]) { /* istanbul ignore else */
                resultArgs.forEach(x => console[name](x));
              }
            }
          })
        }

        /**
         * Logs the result of an [`async` function]{@link AsyncFunction} to the
         * `console` using `console.dir` to display the properties of the resulting object.
         * Only works in Node.js or in browsers that support `console.dir` and
         * `console.error` (such as FF and Chrome).
         * If multiple arguments are returned from the async function,
         * `console.dir` is called on each argument in order.
         *
         * @name dir
         * @static
         * @memberOf module:Utils
         * @method
         * @category Util
         * @param {AsyncFunction} function - The function you want to eventually apply
         * all arguments to.
         * @param {...*} arguments... - Any number of arguments to apply to the function.
         * @example
         *
         * // in a module
         * var hello = function(name, callback) {
         *     setTimeout(function() {
         *         callback(null, {hello: name});
         *     }, 1000);
         * };
         *
         * // in the node repl
         * node> async.dir(hello, 'world');
         * {hello: 'world'}
         */
        var dir = consoleFunc('dir');

        /**
         * The post-check version of [`whilst`]{@link module:ControlFlow.whilst}. To reflect the difference in
         * the order of operations, the arguments `test` and `iteratee` are switched.
         *
         * `doWhilst` is to `whilst` as `do while` is to `while` in plain JavaScript.
         *
         * @name doWhilst
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.whilst]{@link module:ControlFlow.whilst}
         * @category Control Flow
         * @param {AsyncFunction} iteratee - A function which is called each time `test`
         * passes. Invoked with (callback).
         * @param {AsyncFunction} test - asynchronous truth test to perform after each
         * execution of `iteratee`. Invoked with (...args, callback), where `...args` are the
         * non-error args from the previous callback of `iteratee`.
         * @param {Function} [callback] - A callback which is called after the test
         * function has failed and repeated execution of `iteratee` has stopped.
         * `callback` will be passed an error and any arguments passed to the final
         * `iteratee`'s callback. Invoked with (err, [results]);
         * @returns {Promise} a promise, if no callback is passed
         */
        function doWhilst(iteratee, test, callback) {
          callback = onlyOnce(callback);
          var _fn = wrapAsync(iteratee);
          var _test = wrapAsync(test);
          var results;

          function next(err, ...args) {
            if (err) return callback(err);
            if (err === false) return;
            results = args;
            _test(...args, check);
          }

          function check(err, truth) {
            if (err) return callback(err);
            if (err === false) return;
            if (!truth) return callback(null, ...results);
            _fn(next);
          }

          return check(null, true);
        }

        var doWhilst$1 = awaitify(doWhilst, 3);

        /**
         * Like ['doWhilst']{@link module:ControlFlow.doWhilst}, except the `test` is inverted. Note the
         * argument ordering differs from `until`.
         *
         * @name doUntil
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.doWhilst]{@link module:ControlFlow.doWhilst}
         * @category Control Flow
         * @param {AsyncFunction} iteratee - An async function which is called each time
         * `test` fails. Invoked with (callback).
         * @param {AsyncFunction} test - asynchronous truth test to perform after each
         * execution of `iteratee`. Invoked with (...args, callback), where `...args` are the
         * non-error args from the previous callback of `iteratee`
         * @param {Function} [callback] - A callback which is called after the test
         * function has passed and repeated execution of `iteratee` has stopped. `callback`
         * will be passed an error and any arguments passed to the final `iteratee`'s
         * callback. Invoked with (err, [results]);
         * @returns {Promise} a promise, if no callback is passed
         */
        function doUntil(iteratee, test, callback) {
          const _test = wrapAsync(test);
          return doWhilst$1(iteratee, (...args) => {
            const cb = args.pop();
            _test(...args, (err, truth) => cb(err, !truth));
          }, callback);
        }

        function _withoutIndex(iteratee) {
          return (value, index, callback) => iteratee(value, callback);
        }

        /**
         * Applies the function `iteratee` to each item in `coll`, in parallel.
         * The `iteratee` is called with an item from the list, and a callback for when
         * it has finished. If the `iteratee` passes an error to its `callback`, the
         * main `callback` (for the `each` function) is immediately called with the
         * error.
         *
         * Note, that since this function applies `iteratee` to each item in parallel,
         * there is no guarantee that the iteratee functions will complete in order.
         *
         * @name each
         * @static
         * @memberOf module:Collections
         * @method
         * @alias forEach
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async function to apply to
         * each item in `coll`. Invoked with (item, callback).
         * The array index is not passed to the iteratee.
         * If you need the index, use `eachOf`.
         * @param {Function} [callback] - A callback which is called when all
         * `iteratee` functions have finished, or an error occurs. Invoked with (err).
         * @returns {Promise} a promise, if a callback is omitted
         * @example
         *
         * // dir1 is a directory that contains file1.txt, file2.txt
         * // dir2 is a directory that contains file3.txt, file4.txt
         * // dir3 is a directory that contains file5.txt
         * // dir4 does not exist
         *
         * const fileList = [ 'dir1/file2.txt', 'dir2/file3.txt', 'dir/file5.txt'];
         * const withMissingFileList = ['dir1/file1.txt', 'dir4/file2.txt'];
         *
         * // asynchronous function that deletes a file
         * const deleteFile = function(file, callback) {
         *     fs.unlink(file, callback);
         * };
         *
         * // Using callbacks
         * async.each(fileList, deleteFile, function(err) {
         *     if( err ) {
         *         console.log(err);
         *     } else {
         *         console.log('All files have been deleted successfully');
         *     }
         * });
         *
         * // Error Handling
         * async.each(withMissingFileList, deleteFile, function(err){
         *     console.log(err);
         *     // [ Error: ENOENT: no such file or directory ]
         *     // since dir4/file2.txt does not exist
         *     // dir1/file1.txt could have been deleted
         * });
         *
         * // Using Promises
         * async.each(fileList, deleteFile)
         * .then( () => {
         *     console.log('All files have been deleted successfully');
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * // Error Handling
         * async.each(fileList, deleteFile)
         * .then( () => {
         *     console.log('All files have been deleted successfully');
         * }).catch( err => {
         *     console.log(err);
         *     // [ Error: ENOENT: no such file or directory ]
         *     // since dir4/file2.txt does not exist
         *     // dir1/file1.txt could have been deleted
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         await async.each(files, deleteFile);
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * // Error Handling
         * async () => {
         *     try {
         *         await async.each(withMissingFileList, deleteFile);
         *     }
         *     catch (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *         // since dir4/file2.txt does not exist
         *         // dir1/file1.txt could have been deleted
         *     }
         * }
         *
         */
        function eachLimit(coll, iteratee, callback) {
          return eachOf$1(coll, _withoutIndex(wrapAsync(iteratee)), callback);
        }

        var each = awaitify(eachLimit, 3);

        /**
         * The same as [`each`]{@link module:Collections.each} but runs a maximum of `limit` async operations at a time.
         *
         * @name eachLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.each]{@link module:Collections.each}
         * @alias forEachLimit
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * The array index is not passed to the iteratee.
         * If you need the index, use `eachOfLimit`.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called when all
         * `iteratee` functions have finished, or an error occurs. Invoked with (err).
         * @returns {Promise} a promise, if a callback is omitted
         */
        function eachLimit$1(coll, limit, iteratee, callback) {
          return eachOfLimit(limit)(coll, _withoutIndex(wrapAsync(iteratee)), callback);
        }
        var eachLimit$2 = awaitify(eachLimit$1, 4);

        /**
         * The same as [`each`]{@link module:Collections.each} but runs only a single async operation at a time.
         *
         * Note, that unlike [`each`]{@link module:Collections.each}, this function applies iteratee to each item
         * in series and therefore the iteratee functions will complete in order.
        
         * @name eachSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.each]{@link module:Collections.each}
         * @alias forEachSeries
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async function to apply to each
         * item in `coll`.
         * The array index is not passed to the iteratee.
         * If you need the index, use `eachOfSeries`.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called when all
         * `iteratee` functions have finished, or an error occurs. Invoked with (err).
         * @returns {Promise} a promise, if a callback is omitted
         */
        function eachSeries(coll, iteratee, callback) {
          return eachLimit$2(coll, 1, iteratee, callback)
        }
        var eachSeries$1 = awaitify(eachSeries, 3);

        /**
         * Wrap an async function and ensure it calls its callback on a later tick of
         * the event loop.  If the function already calls its callback on a next tick,
         * no extra deferral is added. This is useful for preventing stack overflows
         * (`RangeError: Maximum call stack size exceeded`) and generally keeping
         * [Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)
         * contained. ES2017 `async` functions are returned as-is -- they are immune
         * to Zalgo's corrupting influences, as they always resolve on a later tick.
         *
         * @name ensureAsync
         * @static
         * @memberOf module:Utils
         * @method
         * @category Util
         * @param {AsyncFunction} fn - an async function, one that expects a node-style
         * callback as its last argument.
         * @returns {AsyncFunction} Returns a wrapped function with the exact same call
         * signature as the function passed in.
         * @example
         *
         * function sometimesAsync(arg, callback) {
         *     if (cache[arg]) {
         *         return callback(null, cache[arg]); // this would be synchronous!!
         *     } else {
         *         doSomeIO(arg, callback); // this IO would be asynchronous
         *     }
         * }
         *
         * // this has a risk of stack overflows if many results are cached in a row
         * async.mapSeries(args, sometimesAsync, done);
         *
         * // this will defer sometimesAsync's callback if necessary,
         * // preventing stack overflows
         * async.mapSeries(args, async.ensureAsync(sometimesAsync), done);
         */
        function ensureAsync(fn) {
          if (isAsync(fn)) return fn;
          return function (...args/*, callback*/) {
            var callback = args.pop();
            var sync = true;
            args.push((...innerArgs) => {
              if (sync) {
                setImmediate$1(() => callback(...innerArgs));
              } else {
                callback(...innerArgs);
              }
            });
            fn.apply(this, args);
            sync = false;
          };
        }

        /**
         * Returns `true` if every element in `coll` satisfies an async test. If any
         * iteratee call returns `false`, the main `callback` is immediately called.
         *
         * @name every
         * @static
         * @memberOf module:Collections
         * @method
         * @alias all
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async truth test to apply to each item
         * in the collection in parallel.
         * The iteratee must complete with a boolean result value.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Result will be either `true` or `false`
         * depending on the values of the async tests. Invoked with (err, result).
         * @returns {Promise} a promise, if no callback provided
         * @example
         *
         * // dir1 is a directory that contains file1.txt, file2.txt
         * // dir2 is a directory that contains file3.txt, file4.txt
         * // dir3 is a directory that contains file5.txt
         * // dir4 does not exist
         *
         * const fileList = ['dir1/file1.txt','dir2/file3.txt','dir3/file5.txt'];
         * const withMissingFileList = ['file1.txt','file2.txt','file4.txt'];
         *
         * // asynchronous function that checks if a file exists
         * function fileExists(file, callback) {
         *    fs.access(file, fs.constants.F_OK, (err) => {
         *        callback(null, !err);
         *    });
         * }
         *
         * // Using callbacks
         * async.every(fileList, fileExists, function(err, result) {
         *     console.log(result);
         *     // true
         *     // result is true since every file exists
         * });
         *
         * async.every(withMissingFileList, fileExists, function(err, result) {
         *     console.log(result);
         *     // false
         *     // result is false since NOT every file exists
         * });
         *
         * // Using Promises
         * async.every(fileList, fileExists)
         * .then( result => {
         *     console.log(result);
         *     // true
         *     // result is true since every file exists
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * async.every(withMissingFileList, fileExists)
         * .then( result => {
         *     console.log(result);
         *     // false
         *     // result is false since NOT every file exists
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let result = await async.every(fileList, fileExists);
         *         console.log(result);
         *         // true
         *         // result is true since every file exists
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * async () => {
         *     try {
         *         let result = await async.every(withMissingFileList, fileExists);
         *         console.log(result);
         *         // false
         *         // result is false since NOT every file exists
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function every(coll, iteratee, callback) {
          return _createTester(bool => !bool, res => !res)(eachOf$1, coll, iteratee, callback)
        }
        var every$1 = awaitify(every, 3);

        /**
         * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
         *
         * @name everyLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.every]{@link module:Collections.every}
         * @alias allLimit
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - An async truth test to apply to each item
         * in the collection in parallel.
         * The iteratee must complete with a boolean result value.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Result will be either `true` or `false`
         * depending on the values of the async tests. Invoked with (err, result).
         * @returns {Promise} a promise, if no callback provided
         */
        function everyLimit(coll, limit, iteratee, callback) {
          return _createTester(bool => !bool, res => !res)(eachOfLimit(limit), coll, iteratee, callback)
        }
        var everyLimit$1 = awaitify(everyLimit, 4);

        /**
         * The same as [`every`]{@link module:Collections.every} but runs only a single async operation at a time.
         *
         * @name everySeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.every]{@link module:Collections.every}
         * @alias allSeries
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async truth test to apply to each item
         * in the collection in series.
         * The iteratee must complete with a boolean result value.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Result will be either `true` or `false`
         * depending on the values of the async tests. Invoked with (err, result).
         * @returns {Promise} a promise, if no callback provided
         */
        function everySeries(coll, iteratee, callback) {
          return _createTester(bool => !bool, res => !res)(eachOfSeries$1, coll, iteratee, callback)
        }
        var everySeries$1 = awaitify(everySeries, 3);

        function filterArray(eachfn, arr, iteratee, callback) {
          var truthValues = new Array(arr.length);
          eachfn(arr, (x, index, iterCb) => {
            iteratee(x, (err, v) => {
              truthValues[index] = !!v;
              iterCb(err);
            });
          }, err => {
            if (err) return callback(err);
            var results = [];
            for (var i = 0; i < arr.length; i++) {
              if (truthValues[i]) results.push(arr[i]);
            }
            callback(null, results);
          });
        }

        function filterGeneric(eachfn, coll, iteratee, callback) {
          var results = [];
          eachfn(coll, (x, index, iterCb) => {
            iteratee(x, (err, v) => {
              if (err) return iterCb(err);
              if (v) {
                results.push({ index, value: x });
              }
              iterCb(err);
            });
          }, err => {
            if (err) return callback(err);
            callback(null, results
              .sort((a, b) => a.index - b.index)
              .map(v => v.value));
          });
        }

        function _filter(eachfn, coll, iteratee, callback) {
          var filter = isArrayLike(coll) ? filterArray : filterGeneric;
          return filter(eachfn, coll, wrapAsync(iteratee), callback);
        }

        /**
         * Returns a new array of all the values in `coll` which pass an async truth
         * test. This operation is performed in parallel, but the results array will be
         * in the same order as the original.
         *
         * @name filter
         * @static
         * @memberOf module:Collections
         * @method
         * @alias select
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {Function} iteratee - A truth test to apply to each item in `coll`.
         * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
         * with a boolean argument once it has completed. Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback provided
         * @example
         *
         * // dir1 is a directory that contains file1.txt, file2.txt
         * // dir2 is a directory that contains file3.txt, file4.txt
         * // dir3 is a directory that contains file5.txt
         *
         * const files = ['dir1/file1.txt','dir2/file3.txt','dir3/file6.txt'];
         *
         * // asynchronous function that checks if a file exists
         * function fileExists(file, callback) {
         *    fs.access(file, fs.constants.F_OK, (err) => {
         *        callback(null, !err);
         *    });
         * }
         *
         * // Using callbacks
         * async.filter(files, fileExists, function(err, results) {
         *    if(err) {
         *        console.log(err);
         *    } else {
         *        console.log(results);
         *        // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
         *        // results is now an array of the existing files
         *    }
         * });
         *
         * // Using Promises
         * async.filter(files, fileExists)
         * .then(results => {
         *     console.log(results);
         *     // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
         *     // results is now an array of the existing files
         * }).catch(err => {
         *     console.log(err);
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let results = await async.filter(files, fileExists);
         *         console.log(results);
         *         // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
         *         // results is now an array of the existing files
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function filter(coll, iteratee, callback) {
          return _filter(eachOf$1, coll, iteratee, callback)
        }
        var filter$1 = awaitify(filter, 3);

        /**
         * The same as [`filter`]{@link module:Collections.filter} but runs a maximum of `limit` async operations at a
         * time.
         *
         * @name filterLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.filter]{@link module:Collections.filter}
         * @alias selectLimit
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {Function} iteratee - A truth test to apply to each item in `coll`.
         * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
         * with a boolean argument once it has completed. Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback provided
         */
        function filterLimit(coll, limit, iteratee, callback) {
          return _filter(eachOfLimit(limit), coll, iteratee, callback)
        }
        var filterLimit$1 = awaitify(filterLimit, 4);

        /**
         * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
         *
         * @name filterSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.filter]{@link module:Collections.filter}
         * @alias selectSeries
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {Function} iteratee - A truth test to apply to each item in `coll`.
         * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
         * with a boolean argument once it has completed. Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Invoked with (err, results)
         * @returns {Promise} a promise, if no callback provided
         */
        function filterSeries(coll, iteratee, callback) {
          return _filter(eachOfSeries$1, coll, iteratee, callback)
        }
        var filterSeries$1 = awaitify(filterSeries, 3);

        /**
         * Calls the asynchronous function `fn` with a callback parameter that allows it
         * to call itself again, in series, indefinitely.
        
         * If an error is passed to the callback then `errback` is called with the
         * error, and execution stops, otherwise it will never be called.
         *
         * @name forever
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {AsyncFunction} fn - an async function to call repeatedly.
         * Invoked with (next).
         * @param {Function} [errback] - when `fn` passes an error to it's callback,
         * this function will be called, and execution stops. Invoked with (err).
         * @returns {Promise} a promise that rejects if an error occurs and an errback
         * is not passed
         * @example
         *
         * async.forever(
         *     function(next) {
         *         // next is suitable for passing to things that need a callback(err [, whatever]);
         *         // it will result in this function being called again.
         *     },
         *     function(err) {
         *         // if next is called with a value in its first parameter, it will appear
         *         // in here as 'err', and execution will stop.
         *     }
         * );
         */
        function forever(fn, errback) {
          var done = onlyOnce(errback);
          var task = wrapAsync(ensureAsync(fn));

          function next(err) {
            if (err) return done(err);
            if (err === false) return;
            task(next);
          }
          return next();
        }
        var forever$1 = awaitify(forever, 2);

        /**
         * The same as [`groupBy`]{@link module:Collections.groupBy} but runs a maximum of `limit` async operations at a time.
         *
         * @name groupByLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.groupBy]{@link module:Collections.groupBy}
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * The iteratee should complete with a `key` to group the value under.
         * Invoked with (value, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. Result is an `Object` whoses
         * properties are arrays of values which returned the corresponding key.
         * @returns {Promise} a promise, if no callback is passed
         */
        function groupByLimit(coll, limit, iteratee, callback) {
          var _iteratee = wrapAsync(iteratee);
          return mapLimit$1(coll, limit, (val, iterCb) => {
            _iteratee(val, (err, key) => {
              if (err) return iterCb(err);
              return iterCb(err, { key, val });
            });
          }, (err, mapResults) => {
            var result = {};
            // from MDN, handle object having an `hasOwnProperty` prop
            var { hasOwnProperty } = Object.prototype;

            for (var i = 0; i < mapResults.length; i++) {
              if (mapResults[i]) {
                var { key } = mapResults[i];
                var { val } = mapResults[i];

                if (hasOwnProperty.call(result, key)) {
                  result[key].push(val);
                } else {
                  result[key] = [val];
                }
              }
            }

            return callback(err, result);
          });
        }

        var groupByLimit$1 = awaitify(groupByLimit, 4);

        /**
         * Returns a new object, where each value corresponds to an array of items, from
         * `coll`, that returned the corresponding key. That is, the keys of the object
         * correspond to the values passed to the `iteratee` callback.
         *
         * Note: Since this function applies the `iteratee` to each item in parallel,
         * there is no guarantee that the `iteratee` functions will complete in order.
         * However, the values for each key in the `result` will be in the same order as
         * the original `coll`. For Objects, the values will roughly be in the order of
         * the original Objects' keys (but this can vary across JavaScript engines).
         *
         * @name groupBy
         * @static
         * @memberOf module:Collections
         * @method
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * The iteratee should complete with a `key` to group the value under.
         * Invoked with (value, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. Result is an `Object` whoses
         * properties are arrays of values which returned the corresponding key.
         * @returns {Promise} a promise, if no callback is passed
         * @example
         *
         * // dir1 is a directory that contains file1.txt, file2.txt
         * // dir2 is a directory that contains file3.txt, file4.txt
         * // dir3 is a directory that contains file5.txt
         * // dir4 does not exist
         *
         * const files = ['dir1/file1.txt','dir2','dir4']
         *
         * // asynchronous function that detects file type as none, file, or directory
         * function detectFile(file, callback) {
         *     fs.stat(file, function(err, stat) {
         *         if (err) {
         *             return callback(null, 'none');
         *         }
         *         callback(null, stat.isDirectory() ? 'directory' : 'file');
         *     });
         * }
         *
         * //Using callbacks
         * async.groupBy(files, detectFile, function(err, result) {
         *     if(err) {
         *         console.log(err);
         *     } else {
         *	       console.log(result);
         *         // {
         *         //     file: [ 'dir1/file1.txt' ],
         *         //     none: [ 'dir4' ],
         *         //     directory: [ 'dir2']
         *         // }
         *         // result is object containing the files grouped by type
         *     }
         * });
         *
         * // Using Promises
         * async.groupBy(files, detectFile)
         * .then( result => {
         *     console.log(result);
         *     // {
         *     //     file: [ 'dir1/file1.txt' ],
         *     //     none: [ 'dir4' ],
         *     //     directory: [ 'dir2']
         *     // }
         *     // result is object containing the files grouped by type
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let result = await async.groupBy(files, detectFile);
         *         console.log(result);
         *         // {
         *         //     file: [ 'dir1/file1.txt' ],
         *         //     none: [ 'dir4' ],
         *         //     directory: [ 'dir2']
         *         // }
         *         // result is object containing the files grouped by type
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function groupBy(coll, iteratee, callback) {
          return groupByLimit$1(coll, Infinity, iteratee, callback)
        }

        /**
         * The same as [`groupBy`]{@link module:Collections.groupBy} but runs only a single async operation at a time.
         *
         * @name groupBySeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.groupBy]{@link module:Collections.groupBy}
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * The iteratee should complete with a `key` to group the value under.
         * Invoked with (value, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. Result is an `Object` whose
         * properties are arrays of values which returned the corresponding key.
         * @returns {Promise} a promise, if no callback is passed
         */
        function groupBySeries(coll, iteratee, callback) {
          return groupByLimit$1(coll, 1, iteratee, callback)
        }

        /**
         * Logs the result of an `async` function to the `console`. Only works in
         * Node.js or in browsers that support `console.log` and `console.error` (such
         * as FF and Chrome). If multiple arguments are returned from the async
         * function, `console.log` is called on each argument in order.
         *
         * @name log
         * @static
         * @memberOf module:Utils
         * @method
         * @category Util
         * @param {AsyncFunction} function - The function you want to eventually apply
         * all arguments to.
         * @param {...*} arguments... - Any number of arguments to apply to the function.
         * @example
         *
         * // in a module
         * var hello = function(name, callback) {
         *     setTimeout(function() {
         *         callback(null, 'hello ' + name);
         *     }, 1000);
         * };
         *
         * // in the node repl
         * node> async.log(hello, 'world');
         * 'hello world'
         */
        var log = consoleFunc('log');

        /**
         * The same as [`mapValues`]{@link module:Collections.mapValues} but runs a maximum of `limit` async operations at a
         * time.
         *
         * @name mapValuesLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.mapValues]{@link module:Collections.mapValues}
         * @category Collection
         * @param {Object} obj - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - A function to apply to each value and key
         * in `coll`.
         * The iteratee should complete with the transformed value as its result.
         * Invoked with (value, key, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. `result` is a new object consisting
         * of each key from `obj`, with each transformed value on the right-hand side.
         * Invoked with (err, result).
         * @returns {Promise} a promise, if no callback is passed
         */
        function mapValuesLimit(obj, limit, iteratee, callback) {
          callback = once(callback);
          var newObj = {};
          var _iteratee = wrapAsync(iteratee);
          return eachOfLimit(limit)(obj, (val, key, next) => {
            _iteratee(val, key, (err, result) => {
              if (err) return next(err);
              newObj[key] = result;
              next(err);
            });
          }, err => callback(err, newObj));
        }

        var mapValuesLimit$1 = awaitify(mapValuesLimit, 4);

        /**
         * A relative of [`map`]{@link module:Collections.map}, designed for use with objects.
         *
         * Produces a new Object by mapping each value of `obj` through the `iteratee`
         * function. The `iteratee` is called each `value` and `key` from `obj` and a
         * callback for when it has finished processing. Each of these callbacks takes
         * two arguments: an `error`, and the transformed item from `obj`. If `iteratee`
         * passes an error to its callback, the main `callback` (for the `mapValues`
         * function) is immediately called with the error.
         *
         * Note, the order of the keys in the result is not guaranteed.  The keys will
         * be roughly in the order they complete, (but this is very engine-specific)
         *
         * @name mapValues
         * @static
         * @memberOf module:Collections
         * @method
         * @category Collection
         * @param {Object} obj - A collection to iterate over.
         * @param {AsyncFunction} iteratee - A function to apply to each value and key
         * in `coll`.
         * The iteratee should complete with the transformed value as its result.
         * Invoked with (value, key, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. `result` is a new object consisting
         * of each key from `obj`, with each transformed value on the right-hand side.
         * Invoked with (err, result).
         * @returns {Promise} a promise, if no callback is passed
         * @example
         *
         * // file1.txt is a file that is 1000 bytes in size
         * // file2.txt is a file that is 2000 bytes in size
         * // file3.txt is a file that is 3000 bytes in size
         * // file4.txt does not exist
         *
         * const fileMap = {
         *     f1: 'file1.txt',
         *     f2: 'file2.txt',
         *     f3: 'file3.txt'
         * };
         *
         * const withMissingFileMap = {
         *     f1: 'file1.txt',
         *     f2: 'file2.txt',
         *     f3: 'file4.txt'
         * };
         *
         * // asynchronous function that returns the file size in bytes
         * function getFileSizeInBytes(file, key, callback) {
         *     fs.stat(file, function(err, stat) {
         *         if (err) {
         *             return callback(err);
         *         }
         *         callback(null, stat.size);
         *     });
         * }
         *
         * // Using callbacks
         * async.mapValues(fileMap, getFileSizeInBytes, function(err, result) {
         *     if (err) {
         *         console.log(err);
         *     } else {
         *         console.log(result);
         *         // result is now a map of file size in bytes for each file, e.g.
         *         // {
         *         //     f1: 1000,
         *         //     f2: 2000,
         *         //     f3: 3000
         *         // }
         *     }
         * });
         *
         * // Error handling
         * async.mapValues(withMissingFileMap, getFileSizeInBytes, function(err, result) {
         *     if (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *     } else {
         *         console.log(result);
         *     }
         * });
         *
         * // Using Promises
         * async.mapValues(fileMap, getFileSizeInBytes)
         * .then( result => {
         *     console.log(result);
         *     // result is now a map of file size in bytes for each file, e.g.
         *     // {
         *     //     f1: 1000,
         *     //     f2: 2000,
         *     //     f3: 3000
         *     // }
         * }).catch (err => {
         *     console.log(err);
         * });
         *
         * // Error Handling
         * async.mapValues(withMissingFileMap, getFileSizeInBytes)
         * .then( result => {
         *     console.log(result);
         * }).catch (err => {
         *     console.log(err);
         *     // [ Error: ENOENT: no such file or directory ]
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let result = await async.mapValues(fileMap, getFileSizeInBytes);
         *         console.log(result);
         *         // result is now a map of file size in bytes for each file, e.g.
         *         // {
         *         //     f1: 1000,
         *         //     f2: 2000,
         *         //     f3: 3000
         *         // }
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * // Error Handling
         * async () => {
         *     try {
         *         let result = await async.mapValues(withMissingFileMap, getFileSizeInBytes);
         *         console.log(result);
         *     }
         *     catch (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *     }
         * }
         *
         */
        function mapValues(obj, iteratee, callback) {
          return mapValuesLimit$1(obj, Infinity, iteratee, callback)
        }

        /**
         * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
         *
         * @name mapValuesSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.mapValues]{@link module:Collections.mapValues}
         * @category Collection
         * @param {Object} obj - A collection to iterate over.
         * @param {AsyncFunction} iteratee - A function to apply to each value and key
         * in `coll`.
         * The iteratee should complete with the transformed value as its result.
         * Invoked with (value, key, callback).
         * @param {Function} [callback] - A callback which is called when all `iteratee`
         * functions have finished, or an error occurs. `result` is a new object consisting
         * of each key from `obj`, with each transformed value on the right-hand side.
         * Invoked with (err, result).
         * @returns {Promise} a promise, if no callback is passed
         */
        function mapValuesSeries(obj, iteratee, callback) {
          return mapValuesLimit$1(obj, 1, iteratee, callback)
        }

        /**
         * Caches the results of an async function. When creating a hash to store
         * function results against, the callback is omitted from the hash and an
         * optional hash function can be used.
         *
         * **Note: if the async function errs, the result will not be cached and
         * subsequent calls will call the wrapped function.**
         *
         * If no hash function is specified, the first argument is used as a hash key,
         * which may work reasonably if it is a string or a data type that converts to a
         * distinct string. Note that objects and arrays will not behave reasonably.
         * Neither will cases where the other arguments are significant. In such cases,
         * specify your own hash function.
         *
         * The cache of results is exposed as the `memo` property of the function
         * returned by `memoize`.
         *
         * @name memoize
         * @static
         * @memberOf module:Utils
         * @method
         * @category Util
         * @param {AsyncFunction} fn - The async function to proxy and cache results from.
         * @param {Function} hasher - An optional function for generating a custom hash
         * for storing results. It has all the arguments applied to it apart from the
         * callback, and must be synchronous.
         * @returns {AsyncFunction} a memoized version of `fn`
         * @example
         *
         * var slow_fn = function(name, callback) {
         *     // do something
         *     callback(null, result);
         * };
         * var fn = async.memoize(slow_fn);
         *
         * // fn can now be used as if it were slow_fn
         * fn('some name', function() {
         *     // callback
         * });
         */
        function memoize(fn, hasher = v => v) {
          var memo = Object.create(null);
          var queues = Object.create(null);
          var _fn = wrapAsync(fn);
          var memoized = initialParams((args, callback) => {
            var key = hasher(...args);
            if (key in memo) {
              setImmediate$1(() => callback(null, ...memo[key]));
            } else if (key in queues) {
              queues[key].push(callback);
            } else {
              queues[key] = [callback];
              _fn(...args, (err, ...resultArgs) => {
                // #1465 don't memoize if an error occurred
                if (!err) {
                  memo[key] = resultArgs;
                }
                var q = queues[key];
                delete queues[key];
                for (var i = 0, l = q.length; i < l; i++) {
                  q[i](err, ...resultArgs);
                }
              });
            }
          });
          memoized.memo = memo;
          memoized.unmemoized = fn;
          return memoized;
        }

        /* istanbul ignore file */

        /**
         * Calls `callback` on a later loop around the event loop. In Node.js this just
         * calls `process.nextTick`.  In the browser it will use `setImmediate` if
         * available, otherwise `setTimeout(callback, 0)`, which means other higher
         * priority events may precede the execution of `callback`.
         *
         * This is used internally for browser-compatibility purposes.
         *
         * @name nextTick
         * @static
         * @memberOf module:Utils
         * @method
         * @see [async.setImmediate]{@link module:Utils.setImmediate}
         * @category Util
         * @param {Function} callback - The function to call on a later loop around
         * the event loop. Invoked with (args...).
         * @param {...*} args... - any number of additional arguments to pass to the
         * callback on the next tick.
         * @example
         *
         * var call_order = [];
         * async.nextTick(function() {
         *     call_order.push('two');
         *     // call_order now equals ['one','two']
         * });
         * call_order.push('one');
         *
         * async.setImmediate(function (a, b, c) {
         *     // a, b, and c equal 1, 2, and 3
         * }, 1, 2, 3);
         */
        var _defer$1;

        if (hasNextTick) {
          _defer$1 = process.nextTick;
        } else if (hasSetImmediate) {
          _defer$1 = setImmediate;
        } else {
          _defer$1 = fallback;
        }

        var nextTick = wrap(_defer$1);

        var parallel = awaitify((eachfn, tasks, callback) => {
          var results = isArrayLike(tasks) ? [] : {};

          eachfn(tasks, (task, key, taskCb) => {
            wrapAsync(task)((err, ...result) => {
              if (result.length < 2) {
                [result] = result;
              }
              results[key] = result;
              taskCb(err);
            });
          }, err => callback(err, results));
        }, 3);

        /**
         * Run the `tasks` collection of functions in parallel, without waiting until
         * the previous function has completed. If any of the functions pass an error to
         * its callback, the main `callback` is immediately called with the value of the
         * error. Once the `tasks` have completed, the results are passed to the final
         * `callback` as an array.
         *
         * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
         * parallel execution of code.  If your tasks do not use any timers or perform
         * any I/O, they will actually be executed in series.  Any synchronous setup
         * sections for each task will happen one after the other.  JavaScript remains
         * single-threaded.
         *
         * **Hint:** Use [`reflect`]{@link module:Utils.reflect} to continue the
         * execution of other tasks when a task fails.
         *
         * It is also possible to use an object instead of an array. Each property will
         * be run as a function and the results will be passed to the final `callback`
         * as an object instead of an array. This can be a more readable way of handling
         * results from {@link async.parallel}.
         *
         * @name parallel
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection of
         * [async functions]{@link AsyncFunction} to run.
         * Each async function can complete with any number of optional `result` values.
         * @param {Function} [callback] - An optional callback to run once all the
         * functions have completed successfully. This function gets a results array
         * (or object) containing all the result arguments passed to the task callbacks.
         * Invoked with (err, results).
         * @returns {Promise} a promise, if a callback is not passed
         *
         * @example
         *
         * //Using Callbacks
         * async.parallel([
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'one');
         *         }, 200);
         *     },
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'two');
         *         }, 100);
         *     }
         * ], function(err, results) {
         *     console.log(results);
         *     // results is equal to ['one','two'] even though
         *     // the second function had a shorter timeout.
         * });
         *
         * // an example using an object instead of an array
         * async.parallel({
         *     one: function(callback) {
         *         setTimeout(function() {
         *             callback(null, 1);
         *         }, 200);
         *     },
         *     two: function(callback) {
         *         setTimeout(function() {
         *             callback(null, 2);
         *         }, 100);
         *     }
         * }, function(err, results) {
         *     console.log(results);
         *     // results is equal to: { one: 1, two: 2 }
         * });
         *
         * //Using Promises
         * async.parallel([
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'one');
         *         }, 200);
         *     },
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'two');
         *         }, 100);
         *     }
         * ]).then(results => {
         *     console.log(results);
         *     // results is equal to ['one','two'] even though
         *     // the second function had a shorter timeout.
         * }).catch(err => {
         *     console.log(err);
         * });
         *
         * // an example using an object instead of an array
         * async.parallel({
         *     one: function(callback) {
         *         setTimeout(function() {
         *             callback(null, 1);
         *         }, 200);
         *     },
         *     two: function(callback) {
         *         setTimeout(function() {
         *             callback(null, 2);
         *         }, 100);
         *     }
         * }).then(results => {
         *     console.log(results);
         *     // results is equal to: { one: 1, two: 2 }
         * }).catch(err => {
         *     console.log(err);
         * });
         *
         * //Using async/await
         * async () => {
         *     try {
         *         let results = await async.parallel([
         *             function(callback) {
         *                 setTimeout(function() {
         *                     callback(null, 'one');
         *                 }, 200);
         *             },
         *             function(callback) {
         *                 setTimeout(function() {
         *                     callback(null, 'two');
         *                 }, 100);
         *             }
         *         ]);
         *         console.log(results);
         *         // results is equal to ['one','two'] even though
         *         // the second function had a shorter timeout.
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * // an example using an object instead of an array
         * async () => {
         *     try {
         *         let results = await async.parallel({
         *             one: function(callback) {
         *                 setTimeout(function() {
         *                     callback(null, 1);
         *                 }, 200);
         *             },
         *            two: function(callback) {
         *                 setTimeout(function() {
         *                     callback(null, 2);
         *                 }, 100);
         *            }
         *         });
         *         console.log(results);
         *         // results is equal to: { one: 1, two: 2 }
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function parallel$1(tasks, callback) {
          return parallel(eachOf$1, tasks, callback);
        }

        /**
         * The same as [`parallel`]{@link module:ControlFlow.parallel} but runs a maximum of `limit` async operations at a
         * time.
         *
         * @name parallelLimit
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.parallel]{@link module:ControlFlow.parallel}
         * @category Control Flow
         * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection of
         * [async functions]{@link AsyncFunction} to run.
         * Each async function can complete with any number of optional `result` values.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {Function} [callback] - An optional callback to run once all the
         * functions have completed successfully. This function gets a results array
         * (or object) containing all the result arguments passed to the task callbacks.
         * Invoked with (err, results).
         * @returns {Promise} a promise, if a callback is not passed
         */
        function parallelLimit(tasks, limit, callback) {
          return parallel(eachOfLimit(limit), tasks, callback);
        }

        /**
         * A queue of tasks for the worker function to complete.
         * @typedef {Iterable} QueueObject
         * @memberOf module:ControlFlow
         * @property {Function} length - a function returning the number of items
         * waiting to be processed. Invoke with `queue.length()`.
         * @property {boolean} started - a boolean indicating whether or not any
         * items have been pushed and processed by the queue.
         * @property {Function} running - a function returning the number of items
         * currently being processed. Invoke with `queue.running()`.
         * @property {Function} workersList - a function returning the array of items
         * currently being processed. Invoke with `queue.workersList()`.
         * @property {Function} idle - a function returning false if there are items
         * waiting or being processed, or true if not. Invoke with `queue.idle()`.
         * @property {number} concurrency - an integer for determining how many `worker`
         * functions should be run in parallel. This property can be changed after a
         * `queue` is created to alter the concurrency on-the-fly.
         * @property {number} payload - an integer that specifies how many items are
         * passed to the worker function at a time. only applies if this is a
         * [cargo]{@link module:ControlFlow.cargo} object
         * @property {AsyncFunction} push - add a new task to the `queue`. Calls `callback`
         * once the `worker` has finished processing the task. Instead of a single task,
         * a `tasks` array can be submitted. The respective callback is used for every
         * task in the list. Invoke with `queue.push(task, [callback])`,
         * @property {AsyncFunction} unshift - add a new task to the front of the `queue`.
         * Invoke with `queue.unshift(task, [callback])`.
         * @property {AsyncFunction} pushAsync - the same as `q.push`, except this returns
         * a promise that rejects if an error occurs.
         * @property {AsyncFunction} unshiftAsync - the same as `q.unshift`, except this returns
         * a promise that rejects if an error occurs.
         * @property {Function} remove - remove items from the queue that match a test
         * function.  The test function will be passed an object with a `data` property,
         * and a `priority` property, if this is a
         * [priorityQueue]{@link module:ControlFlow.priorityQueue} object.
         * Invoked with `queue.remove(testFn)`, where `testFn` is of the form
         * `function ({data, priority}) {}` and returns a Boolean.
         * @property {Function} saturated - a function that sets a callback that is
         * called when the number of running workers hits the `concurrency` limit, and
         * further tasks will be queued.  If the callback is omitted, `q.saturated()`
         * returns a promise for the next occurrence.
         * @property {Function} unsaturated - a function that sets a callback that is
         * called when the number of running workers is less than the `concurrency` &
         * `buffer` limits, and further tasks will not be queued. If the callback is
         * omitted, `q.unsaturated()` returns a promise for the next occurrence.
         * @property {number} buffer - A minimum threshold buffer in order to say that
         * the `queue` is `unsaturated`.
         * @property {Function} empty - a function that sets a callback that is called
         * when the last item from the `queue` is given to a `worker`. If the callback
         * is omitted, `q.empty()` returns a promise for the next occurrence.
         * @property {Function} drain - a function that sets a callback that is called
         * when the last item from the `queue` has returned from the `worker`. If the
         * callback is omitted, `q.drain()` returns a promise for the next occurrence.
         * @property {Function} error - a function that sets a callback that is called
         * when a task errors. Has the signature `function(error, task)`. If the
         * callback is omitted, `error()` returns a promise that rejects on the next
         * error.
         * @property {boolean} paused - a boolean for determining whether the queue is
         * in a paused state.
         * @property {Function} pause - a function that pauses the processing of tasks
         * until `resume()` is called. Invoke with `queue.pause()`.
         * @property {Function} resume - a function that resumes the processing of
         * queued tasks when the queue is paused. Invoke with `queue.resume()`.
         * @property {Function} kill - a function that removes the `drain` callback and
         * empties remaining tasks from the queue forcing it to go idle. No more tasks
         * should be pushed to the queue after calling this function. Invoke with `queue.kill()`.
         *
         * @example
         * const q = async.queue(worker, 2)
         * q.push(item1)
         * q.push(item2)
         * q.push(item3)
         * // queues are iterable, spread into an array to inspect
         * const items = [...q] // [item1, item2, item3]
         * // or use for of
         * for (let item of q) {
         *     console.log(item)
         * }
         *
         * q.drain(() => {
         *     console.log('all done')
         * })
         * // or
         * await q.drain()
         */

        /**
         * Creates a `queue` object with the specified `concurrency`. Tasks added to the
         * `queue` are processed in parallel (up to the `concurrency` limit). If all
         * `worker`s are in progress, the task is queued until one becomes available.
         * Once a `worker` completes a `task`, that `task`'s callback is called.
         *
         * @name queue
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {AsyncFunction} worker - An async function for processing a queued task.
         * If you want to handle errors from an individual task, pass a callback to
         * `q.push()`. Invoked with (task, callback).
         * @param {number} [concurrency=1] - An `integer` for determining how many
         * `worker` functions should be run in parallel.  If omitted, the concurrency
         * defaults to `1`.  If the concurrency is `0`, an error is thrown.
         * @returns {module:ControlFlow.QueueObject} A queue object to manage the tasks. Callbacks can be
         * attached as certain properties to listen for specific events during the
         * lifecycle of the queue.
         * @example
         *
         * // create a queue object with concurrency 2
         * var q = async.queue(function(task, callback) {
         *     console.log('hello ' + task.name);
         *     callback();
         * }, 2);
         *
         * // assign a callback
         * q.drain(function() {
         *     console.log('all items have been processed');
         * });
         * // or await the end
         * await q.drain()
         *
         * // assign an error callback
         * q.error(function(err, task) {
         *     console.error('task experienced an error');
         * });
         *
         * // add some items to the queue
         * q.push({name: 'foo'}, function(err) {
         *     console.log('finished processing foo');
         * });
         * // callback is optional
         * q.push({name: 'bar'});
         *
         * // add some items to the queue (batch-wise)
         * q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
         *     console.log('finished processing item');
         * });
         *
         * // add some items to the front of the queue
         * q.unshift({name: 'bar'}, function (err) {
         *     console.log('finished processing bar');
         * });
         */
        function queue$1(worker, concurrency) {
          var _worker = wrapAsync(worker);
          return queue((items, cb) => {
            _worker(items[0], cb);
          }, concurrency, 1);
        }

        // Binary min-heap implementation used for priority queue.
        // Implementation is stable, i.e. push time is considered for equal priorities
        class Heap {
          constructor() {
            this.heap = [];
            this.pushCount = Number.MIN_SAFE_INTEGER;
          }

          get length() {
            return this.heap.length;
          }

          empty() {
            this.heap = [];
            return this;
          }

          percUp(index) {
            let p;

            while (index > 0 && smaller(this.heap[index], this.heap[p = parent(index)])) {
              let t = this.heap[index];
              this.heap[index] = this.heap[p];
              this.heap[p] = t;

              index = p;
            }
          }

          percDown(index) {
            let l;

            while ((l = leftChi(index)) < this.heap.length) {
              if (l + 1 < this.heap.length && smaller(this.heap[l + 1], this.heap[l])) {
                l = l + 1;
              }

              if (smaller(this.heap[index], this.heap[l])) {
                break;
              }

              let t = this.heap[index];
              this.heap[index] = this.heap[l];
              this.heap[l] = t;

              index = l;
            }
          }

          push(node) {
            node.pushCount = ++this.pushCount;
            this.heap.push(node);
            this.percUp(this.heap.length - 1);
          }

          unshift(node) {
            return this.heap.push(node);
          }

          shift() {
            let [top] = this.heap;

            this.heap[0] = this.heap[this.heap.length - 1];
            this.heap.pop();
            this.percDown(0);

            return top;
          }

          toArray() {
            return [...this];
          }

          *[Symbol.iterator]() {
            for (let i = 0; i < this.heap.length; i++) {
              yield this.heap[i].data;
            }
          }

          remove(testFn) {
            let j = 0;
            for (let i = 0; i < this.heap.length; i++) {
              if (!testFn(this.heap[i])) {
                this.heap[j] = this.heap[i];
                j++;
              }
            }

            this.heap.splice(j);

            for (let i = parent(this.heap.length - 1); i >= 0; i--) {
              this.percDown(i);
            }

            return this;
          }
        }

        function leftChi(i) {
          return (i << 1) + 1;
        }

        function parent(i) {
          return ((i + 1) >> 1) - 1;
        }

        function smaller(x, y) {
          if (x.priority !== y.priority) {
            return x.priority < y.priority;
          }
          else {
            return x.pushCount < y.pushCount;
          }
        }

        /**
         * The same as [async.queue]{@link module:ControlFlow.queue} only tasks are assigned a priority and
         * completed in ascending priority order.
         *
         * @name priorityQueue
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.queue]{@link module:ControlFlow.queue}
         * @category Control Flow
         * @param {AsyncFunction} worker - An async function for processing a queued task.
         * If you want to handle errors from an individual task, pass a callback to
         * `q.push()`.
         * Invoked with (task, callback).
         * @param {number} concurrency - An `integer` for determining how many `worker`
         * functions should be run in parallel.  If omitted, the concurrency defaults to
         * `1`.  If the concurrency is `0`, an error is thrown.
         * @returns {module:ControlFlow.QueueObject} A priorityQueue object to manage the tasks. There are three
         * differences between `queue` and `priorityQueue` objects:
         * * `push(task, priority, [callback])` - `priority` should be a number. If an
         *   array of `tasks` is given, all tasks will be assigned the same priority.
         * * `pushAsync(task, priority, [callback])` - the same as `priorityQueue.push`,
         *   except this returns a promise that rejects if an error occurs.
         * * The `unshift` and `unshiftAsync` methods were removed.
         */
        function priorityQueue(worker, concurrency) {
          // Start with a normal queue
          var q = queue$1(worker, concurrency);

          var {
            push,
            pushAsync
          } = q;

          q._tasks = new Heap();
          q._createTaskItem = ({ data, priority }, callback) => {
            return {
              data,
              priority,
              callback
            };
          };

          function createDataItems(tasks, priority) {
            if (!Array.isArray(tasks)) {
              return { data: tasks, priority };
            }
            return tasks.map(data => { return { data, priority }; });
          }

          // Override push to accept second parameter representing priority
          q.push = function (data, priority = 0, callback) {
            return push(createDataItems(data, priority), callback);
          };

          q.pushAsync = function (data, priority = 0, callback) {
            return pushAsync(createDataItems(data, priority), callback);
          };

          // Remove unshift functions
          delete q.unshift;
          delete q.unshiftAsync;

          return q;
        }

        /**
         * Runs the `tasks` array of functions in parallel, without waiting until the
         * previous function has completed. Once any of the `tasks` complete or pass an
         * error to its callback, the main `callback` is immediately called. It's
         * equivalent to `Promise.race()`.
         *
         * @name race
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {Array} tasks - An array containing [async functions]{@link AsyncFunction}
         * to run. Each function can complete with an optional `result` value.
         * @param {Function} callback - A callback to run once any of the functions have
         * completed. This function gets an error or result from the first function that
         * completed. Invoked with (err, result).
         * @returns {Promise} a promise, if a callback is omitted
         * @example
         *
         * async.race([
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'one');
         *         }, 200);
         *     },
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'two');
         *         }, 100);
         *     }
         * ],
         * // main callback
         * function(err, result) {
         *     // the result will be equal to 'two' as it finishes earlier
         * });
         */
        function race(tasks, callback) {
          callback = once(callback);
          if (!Array.isArray(tasks)) return callback(new TypeError('First argument to race must be an array of functions'));
          if (!tasks.length) return callback();
          for (var i = 0, l = tasks.length; i < l; i++) {
            wrapAsync(tasks[i])(callback);
          }
        }

        var race$1 = awaitify(race, 2);

        /**
         * Same as [`reduce`]{@link module:Collections.reduce}, only operates on `array` in reverse order.
         *
         * @name reduceRight
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.reduce]{@link module:Collections.reduce}
         * @alias foldr
         * @category Collection
         * @param {Array} array - A collection to iterate over.
         * @param {*} memo - The initial state of the reduction.
         * @param {AsyncFunction} iteratee - A function applied to each item in the
         * array to produce the next step in the reduction.
         * The `iteratee` should complete with the next state of the reduction.
         * If the iteratee completes with an error, the reduction is stopped and the
         * main `callback` is immediately called with the error.
         * Invoked with (memo, item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Result is the reduced value. Invoked with
         * (err, result).
         * @returns {Promise} a promise, if no callback is passed
         */
        function reduceRight(array, memo, iteratee, callback) {
          var reversed = [...array].reverse();
          return reduce$1(reversed, memo, iteratee, callback);
        }

        /**
         * Wraps the async function in another function that always completes with a
         * result object, even when it errors.
         *
         * The result object has either the property `error` or `value`.
         *
         * @name reflect
         * @static
         * @memberOf module:Utils
         * @method
         * @category Util
         * @param {AsyncFunction} fn - The async function you want to wrap
         * @returns {Function} - A function that always passes null to it's callback as
         * the error. The second argument to the callback will be an `object` with
         * either an `error` or a `value` property.
         * @example
         *
         * async.parallel([
         *     async.reflect(function(callback) {
         *         // do some stuff ...
         *         callback(null, 'one');
         *     }),
         *     async.reflect(function(callback) {
         *         // do some more stuff but error ...
         *         callback('bad stuff happened');
         *     }),
         *     async.reflect(function(callback) {
         *         // do some more stuff ...
         *         callback(null, 'two');
         *     })
         * ],
         * // optional callback
         * function(err, results) {
         *     // values
         *     // results[0].value = 'one'
         *     // results[1].error = 'bad stuff happened'
         *     // results[2].value = 'two'
         * });
         */
        function reflect(fn) {
          var _fn = wrapAsync(fn);
          return initialParams(function reflectOn(args, reflectCallback) {
            args.push((error, ...cbArgs) => {
              let retVal = {};
              if (error) {
                retVal.error = error;
              }
              if (cbArgs.length > 0) {
                var value = cbArgs;
                if (cbArgs.length <= 1) {
                  [value] = cbArgs;
                }
                retVal.value = value;
              }
              reflectCallback(null, retVal);
            });

            return _fn.apply(this, args);
          });
        }

        /**
         * A helper function that wraps an array or an object of functions with `reflect`.
         *
         * @name reflectAll
         * @static
         * @memberOf module:Utils
         * @method
         * @see [async.reflect]{@link module:Utils.reflect}
         * @category Util
         * @param {Array|Object|Iterable} tasks - The collection of
         * [async functions]{@link AsyncFunction} to wrap in `async.reflect`.
         * @returns {Array} Returns an array of async functions, each wrapped in
         * `async.reflect`
         * @example
         *
         * let tasks = [
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'one');
         *         }, 200);
         *     },
         *     function(callback) {
         *         // do some more stuff but error ...
         *         callback(new Error('bad stuff happened'));
         *     },
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'two');
         *         }, 100);
         *     }
         * ];
         *
         * async.parallel(async.reflectAll(tasks),
         * // optional callback
         * function(err, results) {
         *     // values
         *     // results[0].value = 'one'
         *     // results[1].error = Error('bad stuff happened')
         *     // results[2].value = 'two'
         * });
         *
         * // an example using an object instead of an array
         * let tasks = {
         *     one: function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'one');
         *         }, 200);
         *     },
         *     two: function(callback) {
         *         callback('two');
         *     },
         *     three: function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'three');
         *         }, 100);
         *     }
         * };
         *
         * async.parallel(async.reflectAll(tasks),
         * // optional callback
         * function(err, results) {
         *     // values
         *     // results.one.value = 'one'
         *     // results.two.error = 'two'
         *     // results.three.value = 'three'
         * });
         */
        function reflectAll(tasks) {
          var results;
          if (Array.isArray(tasks)) {
            results = tasks.map(reflect);
          } else {
            results = {};
            Object.keys(tasks).forEach(key => {
              results[key] = reflect.call(this, tasks[key]);
            });
          }
          return results;
        }

        function reject(eachfn, arr, _iteratee, callback) {
          const iteratee = wrapAsync(_iteratee);
          return _filter(eachfn, arr, (value, cb) => {
            iteratee(value, (err, v) => {
              cb(err, !v);
            });
          }, callback);
        }

        /**
         * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
         *
         * @name reject
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.filter]{@link module:Collections.filter}
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {Function} iteratee - An async truth test to apply to each item in
         * `coll`.
         * The should complete with a boolean value as its `result`.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback is passed
         * @example
         *
         * // dir1 is a directory that contains file1.txt, file2.txt
         * // dir2 is a directory that contains file3.txt, file4.txt
         * // dir3 is a directory that contains file5.txt
         *
         * const fileList = ['dir1/file1.txt','dir2/file3.txt','dir3/file6.txt'];
         *
         * // asynchronous function that checks if a file exists
         * function fileExists(file, callback) {
         *    fs.access(file, fs.constants.F_OK, (err) => {
         *        callback(null, !err);
         *    });
         * }
         *
         * // Using callbacks
         * async.reject(fileList, fileExists, function(err, results) {
         *    // [ 'dir3/file6.txt' ]
         *    // results now equals an array of the non-existing files
         * });
         *
         * // Using Promises
         * async.reject(fileList, fileExists)
         * .then( results => {
         *     console.log(results);
         *     // [ 'dir3/file6.txt' ]
         *     // results now equals an array of the non-existing files
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let results = await async.reject(fileList, fileExists);
         *         console.log(results);
         *         // [ 'dir3/file6.txt' ]
         *         // results now equals an array of the non-existing files
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function reject$1(coll, iteratee, callback) {
          return reject(eachOf$1, coll, iteratee, callback)
        }
        var reject$2 = awaitify(reject$1, 3);

        /**
         * The same as [`reject`]{@link module:Collections.reject} but runs a maximum of `limit` async operations at a
         * time.
         *
         * @name rejectLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.reject]{@link module:Collections.reject}
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {Function} iteratee - An async truth test to apply to each item in
         * `coll`.
         * The should complete with a boolean value as its `result`.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback is passed
         */
        function rejectLimit(coll, limit, iteratee, callback) {
          return reject(eachOfLimit(limit), coll, iteratee, callback)
        }
        var rejectLimit$1 = awaitify(rejectLimit, 4);

        /**
         * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
         *
         * @name rejectSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.reject]{@link module:Collections.reject}
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {Function} iteratee - An async truth test to apply to each item in
         * `coll`.
         * The should complete with a boolean value as its `result`.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback is passed
         */
        function rejectSeries(coll, iteratee, callback) {
          return reject(eachOfSeries$1, coll, iteratee, callback)
        }
        var rejectSeries$1 = awaitify(rejectSeries, 3);

        function constant$1(value) {
          return function () {
            return value;
          }
        }

        /**
         * Attempts to get a successful response from `task` no more than `times` times
         * before returning an error. If the task is successful, the `callback` will be
         * passed the result of the successful task. If all attempts fail, the callback
         * will be passed the error and result (if any) of the final attempt.
         *
         * @name retry
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @see [async.retryable]{@link module:ControlFlow.retryable}
         * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - Can be either an
         * object with `times` and `interval` or a number.
         * * `times` - The number of attempts to make before giving up.  The default
         *   is `5`.
         * * `interval` - The time to wait between retries, in milliseconds.  The
         *   default is `0`. The interval may also be specified as a function of the
         *   retry count (see example).
         * * `errorFilter` - An optional synchronous function that is invoked on
         *   erroneous result. If it returns `true` the retry attempts will continue;
         *   if the function returns `false` the retry flow is aborted with the current
         *   attempt's error and result being returned to the final callback.
         *   Invoked with (err).
         * * If `opts` is a number, the number specifies the number of times to retry,
         *   with the default interval of `0`.
         * @param {AsyncFunction} task - An async function to retry.
         * Invoked with (callback).
         * @param {Function} [callback] - An optional callback which is called when the
         * task has succeeded, or after the final failed attempt. It receives the `err`
         * and `result` arguments of the last attempt at completing the `task`. Invoked
         * with (err, results).
         * @returns {Promise} a promise if no callback provided
         *
         * @example
         *
         * // The `retry` function can be used as a stand-alone control flow by passing
         * // a callback, as shown below:
         *
         * // try calling apiMethod 3 times
         * async.retry(3, apiMethod, function(err, result) {
         *     // do something with the result
         * });
         *
         * // try calling apiMethod 3 times, waiting 200 ms between each retry
         * async.retry({times: 3, interval: 200}, apiMethod, function(err, result) {
         *     // do something with the result
         * });
         *
         * // try calling apiMethod 10 times with exponential backoff
         * // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
         * async.retry({
         *   times: 10,
         *   interval: function(retryCount) {
         *     return 50 * Math.pow(2, retryCount);
         *   }
         * }, apiMethod, function(err, result) {
         *     // do something with the result
         * });
         *
         * // try calling apiMethod the default 5 times no delay between each retry
         * async.retry(apiMethod, function(err, result) {
         *     // do something with the result
         * });
         *
         * // try calling apiMethod only when error condition satisfies, all other
         * // errors will abort the retry control flow and return to final callback
         * async.retry({
         *   errorFilter: function(err) {
         *     return err.message === 'Temporary error'; // only retry on a specific error
         *   }
         * }, apiMethod, function(err, result) {
         *     // do something with the result
         * });
         *
         * // to retry individual methods that are not as reliable within other
         * // control flow functions, use the `retryable` wrapper:
         * async.auto({
         *     users: api.getUsers.bind(api),
         *     payments: async.retryable(3, api.getPayments.bind(api))
         * }, function(err, results) {
         *     // do something with the results
         * });
         *
         */
        const DEFAULT_TIMES = 5;
        const DEFAULT_INTERVAL = 0;

        function retry(opts, task, callback) {
          var options = {
            times: DEFAULT_TIMES,
            intervalFunc: constant$1(DEFAULT_INTERVAL)
          };

          if (arguments.length < 3 && typeof opts === 'function') {
            callback = task || promiseCallback();
            task = opts;
          } else {
            parseTimes(options, opts);
            callback = callback || promiseCallback();
          }

          if (typeof task !== 'function') {
            throw new Error("Invalid arguments for async.retry");
          }

          var _task = wrapAsync(task);

          var attempt = 1;
          function retryAttempt() {
            _task((err, ...args) => {
              if (err === false) return
              if (err && attempt++ < options.times &&
                (typeof options.errorFilter != 'function' ||
                  options.errorFilter(err))) {
                setTimeout(retryAttempt, options.intervalFunc(attempt - 1));
              } else {
                callback(err, ...args);
              }
            });
          }

          retryAttempt();
          return callback[PROMISE_SYMBOL]
        }

        function parseTimes(acc, t) {
          if (typeof t === 'object') {
            acc.times = +t.times || DEFAULT_TIMES;

            acc.intervalFunc = typeof t.interval === 'function' ?
              t.interval :
              constant$1(+t.interval || DEFAULT_INTERVAL);

            acc.errorFilter = t.errorFilter;
          } else if (typeof t === 'number' || typeof t === 'string') {
            acc.times = +t || DEFAULT_TIMES;
          } else {
            throw new Error("Invalid arguments for async.retry");
          }
        }

        /**
         * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method
         * wraps a task and makes it retryable, rather than immediately calling it
         * with retries.
         *
         * @name retryable
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.retry]{@link module:ControlFlow.retry}
         * @category Control Flow
         * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
         * options, exactly the same as from `retry`, except for a `opts.arity` that
         * is the arity of the `task` function, defaulting to `task.length`
         * @param {AsyncFunction} task - the asynchronous function to wrap.
         * This function will be passed any arguments passed to the returned wrapper.
         * Invoked with (...args, callback).
         * @returns {AsyncFunction} The wrapped function, which when invoked, will
         * retry on an error, based on the parameters specified in `opts`.
         * This function will accept the same parameters as `task`.
         * @example
         *
         * async.auto({
         *     dep1: async.retryable(3, getFromFlakyService),
         *     process: ["dep1", async.retryable(3, function (results, cb) {
         *         maybeProcessData(results.dep1, cb);
         *     })]
         * }, callback);
         */
        function retryable(opts, task) {
          if (!task) {
            task = opts;
            opts = null;
          }
          let arity = (opts && opts.arity) || task.length;
          if (isAsync(task)) {
            arity += 1;
          }
          var _task = wrapAsync(task);
          return initialParams((args, callback) => {
            if (args.length < arity - 1 || callback == null) {
              args.push(callback);
              callback = promiseCallback();
            }
            function taskFn(cb) {
              _task(...args, cb);
            }

            if (opts) retry(opts, taskFn, callback);
            else retry(taskFn, callback);

            return callback[PROMISE_SYMBOL]
          });
        }

        /**
         * Run the functions in the `tasks` collection in series, each one running once
         * the previous function has completed. If any functions in the series pass an
         * error to its callback, no more functions are run, and `callback` is
         * immediately called with the value of the error. Otherwise, `callback`
         * receives an array of results when `tasks` have completed.
         *
         * It is also possible to use an object instead of an array. Each property will
         * be run as a function, and the results will be passed to the final `callback`
         * as an object instead of an array. This can be a more readable way of handling
         *  results from {@link async.series}.
         *
         * **Note** that while many implementations preserve the order of object
         * properties, the [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/#sec-8.6)
         * explicitly states that
         *
         * > The mechanics and order of enumerating the properties is not specified.
         *
         * So if you rely on the order in which your series of functions are executed,
         * and want this to work on all platforms, consider using an array.
         *
         * @name series
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection containing
         * [async functions]{@link AsyncFunction} to run in series.
         * Each function can complete with any number of optional `result` values.
         * @param {Function} [callback] - An optional callback to run once all the
         * functions have completed. This function gets a results array (or object)
         * containing all the result arguments passed to the `task` callbacks. Invoked
         * with (err, result).
         * @return {Promise} a promise, if no callback is passed
         * @example
         *
         * //Using Callbacks
         * async.series([
         *     function(callback) {
         *         setTimeout(function() {
         *             // do some async task
         *             callback(null, 'one');
         *         }, 200);
         *     },
         *     function(callback) {
         *         setTimeout(function() {
         *             // then do another async task
         *             callback(null, 'two');
         *         }, 100);
         *     }
         * ], function(err, results) {
         *     console.log(results);
         *     // results is equal to ['one','two']
         * });
         *
         * // an example using objects instead of arrays
         * async.series({
         *     one: function(callback) {
         *         setTimeout(function() {
         *             // do some async task
         *             callback(null, 1);
         *         }, 200);
         *     },
         *     two: function(callback) {
         *         setTimeout(function() {
         *             // then do another async task
         *             callback(null, 2);
         *         }, 100);
         *     }
         * }, function(err, results) {
         *     console.log(results);
         *     // results is equal to: { one: 1, two: 2 }
         * });
         *
         * //Using Promises
         * async.series([
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'one');
         *         }, 200);
         *     },
         *     function(callback) {
         *         setTimeout(function() {
         *             callback(null, 'two');
         *         }, 100);
         *     }
         * ]).then(results => {
         *     console.log(results);
         *     // results is equal to ['one','two']
         * }).catch(err => {
         *     console.log(err);
         * });
         *
         * // an example using an object instead of an array
         * async.series({
         *     one: function(callback) {
         *         setTimeout(function() {
         *             // do some async task
         *             callback(null, 1);
         *         }, 200);
         *     },
         *     two: function(callback) {
         *         setTimeout(function() {
         *             // then do another async task
         *             callback(null, 2);
         *         }, 100);
         *     }
         * }).then(results => {
         *     console.log(results);
         *     // results is equal to: { one: 1, two: 2 }
         * }).catch(err => {
         *     console.log(err);
         * });
         *
         * //Using async/await
         * async () => {
         *     try {
         *         let results = await async.series([
         *             function(callback) {
         *                 setTimeout(function() {
         *                     // do some async task
         *                     callback(null, 'one');
         *                 }, 200);
         *             },
         *             function(callback) {
         *                 setTimeout(function() {
         *                     // then do another async task
         *                     callback(null, 'two');
         *                 }, 100);
         *             }
         *         ]);
         *         console.log(results);
         *         // results is equal to ['one','two']
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * // an example using an object instead of an array
         * async () => {
         *     try {
         *         let results = await async.parallel({
         *             one: function(callback) {
         *                 setTimeout(function() {
         *                     // do some async task
         *                     callback(null, 1);
         *                 }, 200);
         *             },
         *            two: function(callback) {
         *                 setTimeout(function() {
         *                     // then do another async task
         *                     callback(null, 2);
         *                 }, 100);
         *            }
         *         });
         *         console.log(results);
         *         // results is equal to: { one: 1, two: 2 }
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function series(tasks, callback) {
          return parallel(eachOfSeries$1, tasks, callback);
        }

        /**
         * Returns `true` if at least one element in the `coll` satisfies an async test.
         * If any iteratee call returns `true`, the main `callback` is immediately
         * called.
         *
         * @name some
         * @static
         * @memberOf module:Collections
         * @method
         * @alias any
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async truth test to apply to each item
         * in the collections in parallel.
         * The iteratee should complete with a boolean `result` value.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called as soon as any
         * iteratee returns `true`, or after all the iteratee functions have finished.
         * Result will be either `true` or `false` depending on the values of the async
         * tests. Invoked with (err, result).
         * @returns {Promise} a promise, if no callback provided
         * @example
         *
         * // dir1 is a directory that contains file1.txt, file2.txt
         * // dir2 is a directory that contains file3.txt, file4.txt
         * // dir3 is a directory that contains file5.txt
         * // dir4 does not exist
         *
         * // asynchronous function that checks if a file exists
         * function fileExists(file, callback) {
         *    fs.access(file, fs.constants.F_OK, (err) => {
         *        callback(null, !err);
         *    });
         * }
         *
         * // Using callbacks
         * async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists,
         *    function(err, result) {
         *        console.log(result);
         *        // true
         *        // result is true since some file in the list exists
         *    }
         *);
         *
         * async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists,
         *    function(err, result) {
         *        console.log(result);
         *        // false
         *        // result is false since none of the files exists
         *    }
         *);
         *
         * // Using Promises
         * async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists)
         * .then( result => {
         *     console.log(result);
         *     // true
         *     // result is true since some file in the list exists
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists)
         * .then( result => {
         *     console.log(result);
         *     // false
         *     // result is false since none of the files exists
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let result = await async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists);
         *         console.log(result);
         *         // true
         *         // result is true since some file in the list exists
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         * async () => {
         *     try {
         *         let result = await async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists);
         *         console.log(result);
         *         // false
         *         // result is false since none of the files exists
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function some(coll, iteratee, callback) {
          return _createTester(Boolean, res => res)(eachOf$1, coll, iteratee, callback)
        }
        var some$1 = awaitify(some, 3);

        /**
         * The same as [`some`]{@link module:Collections.some} but runs a maximum of `limit` async operations at a time.
         *
         * @name someLimit
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.some]{@link module:Collections.some}
         * @alias anyLimit
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - An async truth test to apply to each item
         * in the collections in parallel.
         * The iteratee should complete with a boolean `result` value.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called as soon as any
         * iteratee returns `true`, or after all the iteratee functions have finished.
         * Result will be either `true` or `false` depending on the values of the async
         * tests. Invoked with (err, result).
         * @returns {Promise} a promise, if no callback provided
         */
        function someLimit(coll, limit, iteratee, callback) {
          return _createTester(Boolean, res => res)(eachOfLimit(limit), coll, iteratee, callback)
        }
        var someLimit$1 = awaitify(someLimit, 4);

        /**
         * The same as [`some`]{@link module:Collections.some} but runs only a single async operation at a time.
         *
         * @name someSeries
         * @static
         * @memberOf module:Collections
         * @method
         * @see [async.some]{@link module:Collections.some}
         * @alias anySeries
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async truth test to apply to each item
         * in the collections in series.
         * The iteratee should complete with a boolean `result` value.
         * Invoked with (item, callback).
         * @param {Function} [callback] - A callback which is called as soon as any
         * iteratee returns `true`, or after all the iteratee functions have finished.
         * Result will be either `true` or `false` depending on the values of the async
         * tests. Invoked with (err, result).
         * @returns {Promise} a promise, if no callback provided
         */
        function someSeries(coll, iteratee, callback) {
          return _createTester(Boolean, res => res)(eachOfSeries$1, coll, iteratee, callback)
        }
        var someSeries$1 = awaitify(someSeries, 3);

        /**
         * Sorts a list by the results of running each `coll` value through an async
         * `iteratee`.
         *
         * @name sortBy
         * @static
         * @memberOf module:Collections
         * @method
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {AsyncFunction} iteratee - An async function to apply to each item in
         * `coll`.
         * The iteratee should complete with a value to use as the sort criteria as
         * its `result`.
         * Invoked with (item, callback).
         * @param {Function} callback - A callback which is called after all the
         * `iteratee` functions have finished, or an error occurs. Results is the items
         * from the original `coll` sorted by the values returned by the `iteratee`
         * calls. Invoked with (err, results).
         * @returns {Promise} a promise, if no callback passed
         * @example
         *
         * // bigfile.txt is a file that is 251100 bytes in size
         * // mediumfile.txt is a file that is 11000 bytes in size
         * // smallfile.txt is a file that is 121 bytes in size
         *
         * // asynchronous function that returns the file size in bytes
         * function getFileSizeInBytes(file, callback) {
         *     fs.stat(file, function(err, stat) {
         *         if (err) {
         *             return callback(err);
         *         }
         *         callback(null, stat.size);
         *     });
         * }
         *
         * // Using callbacks
         * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], getFileSizeInBytes,
         *     function(err, results) {
         *         if (err) {
         *             console.log(err);
         *         } else {
         *             console.log(results);
         *             // results is now the original array of files sorted by
         *             // file size (ascending by default), e.g.
         *             // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
         *         }
         *     }
         * );
         *
         * // By modifying the callback parameter the
         * // sorting order can be influenced:
         *
         * // ascending order
         * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], function(file, callback) {
         *     getFileSizeInBytes(file, function(getFileSizeErr, fileSize) {
         *         if (getFileSizeErr) return callback(getFileSizeErr);
         *         callback(null, fileSize);
         *     });
         * }, function(err, results) {
         *         if (err) {
         *             console.log(err);
         *         } else {
         *             console.log(results);
         *             // results is now the original array of files sorted by
         *             // file size (ascending by default), e.g.
         *             // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
         *         }
         *     }
         * );
         *
         * // descending order
         * async.sortBy(['bigfile.txt','mediumfile.txt','smallfile.txt'], function(file, callback) {
         *     getFileSizeInBytes(file, function(getFileSizeErr, fileSize) {
         *         if (getFileSizeErr) {
         *             return callback(getFileSizeErr);
         *         }
         *         callback(null, fileSize * -1);
         *     });
         * }, function(err, results) {
         *         if (err) {
         *             console.log(err);
         *         } else {
         *             console.log(results);
         *             // results is now the original array of files sorted by
         *             // file size (ascending by default), e.g.
         *             // [ 'bigfile.txt', 'mediumfile.txt', 'smallfile.txt']
         *         }
         *     }
         * );
         *
         * // Error handling
         * async.sortBy(['mediumfile.txt','smallfile.txt','missingfile.txt'], getFileSizeInBytes,
         *     function(err, results) {
         *         if (err) {
         *             console.log(err);
         *             // [ Error: ENOENT: no such file or directory ]
         *         } else {
         *             console.log(results);
         *         }
         *     }
         * );
         *
         * // Using Promises
         * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], getFileSizeInBytes)
         * .then( results => {
         *     console.log(results);
         *     // results is now the original array of files sorted by
         *     // file size (ascending by default), e.g.
         *     // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
         * }).catch( err => {
         *     console.log(err);
         * });
         *
         * // Error handling
         * async.sortBy(['mediumfile.txt','smallfile.txt','missingfile.txt'], getFileSizeInBytes)
         * .then( results => {
         *     console.log(results);
         * }).catch( err => {
         *     console.log(err);
         *     // [ Error: ENOENT: no such file or directory ]
         * });
         *
         * // Using async/await
         * (async () => {
         *     try {
         *         let results = await async.sortBy(['bigfile.txt','mediumfile.txt','smallfile.txt'], getFileSizeInBytes);
         *         console.log(results);
         *         // results is now the original array of files sorted by
         *         // file size (ascending by default), e.g.
         *         // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * })();
         *
         * // Error handling
         * async () => {
         *     try {
         *         let results = await async.sortBy(['missingfile.txt','mediumfile.txt','smallfile.txt'], getFileSizeInBytes);
         *         console.log(results);
         *     }
         *     catch (err) {
         *         console.log(err);
         *         // [ Error: ENOENT: no such file or directory ]
         *     }
         * }
         *
         */
        function sortBy(coll, iteratee, callback) {
          var _iteratee = wrapAsync(iteratee);
          return map$1(coll, (x, iterCb) => {
            _iteratee(x, (err, criteria) => {
              if (err) return iterCb(err);
              iterCb(err, { value: x, criteria });
            });
          }, (err, results) => {
            if (err) return callback(err);
            callback(null, results.sort(comparator).map(v => v.value));
          });

          function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
          }
        }
        var sortBy$1 = awaitify(sortBy, 3);

        /**
         * Sets a time limit on an asynchronous function. If the function does not call
         * its callback within the specified milliseconds, it will be called with a
         * timeout error. The code property for the error object will be `'ETIMEDOUT'`.
         *
         * @name timeout
         * @static
         * @memberOf module:Utils
         * @method
         * @category Util
         * @param {AsyncFunction} asyncFn - The async function to limit in time.
         * @param {number} milliseconds - The specified time limit.
         * @param {*} [info] - Any variable you want attached (`string`, `object`, etc)
         * to timeout Error for more information..
         * @returns {AsyncFunction} Returns a wrapped function that can be used with any
         * of the control flow functions.
         * Invoke this function with the same parameters as you would `asyncFunc`.
         * @example
         *
         * function myFunction(foo, callback) {
         *     doAsyncTask(foo, function(err, data) {
         *         // handle errors
         *         if (err) return callback(err);
         *
         *         // do some stuff ...
         *
         *         // return processed data
         *         return callback(null, data);
         *     });
         * }
         *
         * var wrapped = async.timeout(myFunction, 1000);
         *
         * // call `wrapped` as you would `myFunction`
         * wrapped({ bar: 'bar' }, function(err, data) {
         *     // if `myFunction` takes < 1000 ms to execute, `err`
         *     // and `data` will have their expected values
         *
         *     // else `err` will be an Error with the code 'ETIMEDOUT'
         * });
         */
        function timeout(asyncFn, milliseconds, info) {
          var fn = wrapAsync(asyncFn);

          return initialParams((args, callback) => {
            var timedOut = false;
            var timer;

            function timeoutCallback() {
              var name = asyncFn.name || 'anonymous';
              var error = new Error('Callback function "' + name + '" timed out.');
              error.code = 'ETIMEDOUT';
              if (info) {
                error.info = info;
              }
              timedOut = true;
              callback(error);
            }

            args.push((...cbArgs) => {
              if (!timedOut) {
                callback(...cbArgs);
                clearTimeout(timer);
              }
            });

            // setup timer and call original function
            timer = setTimeout(timeoutCallback, milliseconds);
            fn(...args);
          });
        }

        function range(size) {
          var result = Array(size);
          while (size--) {
            result[size] = size;
          }
          return result;
        }

        /**
         * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
         * time.
         *
         * @name timesLimit
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.times]{@link module:ControlFlow.times}
         * @category Control Flow
         * @param {number} count - The number of times to run the function.
         * @param {number} limit - The maximum number of async operations at a time.
         * @param {AsyncFunction} iteratee - The async function to call `n` times.
         * Invoked with the iteration index and a callback: (n, next).
         * @param {Function} callback - see [async.map]{@link module:Collections.map}.
         * @returns {Promise} a promise, if no callback is provided
         */
        function timesLimit(count, limit, iteratee, callback) {
          var _iteratee = wrapAsync(iteratee);
          return mapLimit$1(range(count), limit, _iteratee, callback);
        }

        /**
         * Calls the `iteratee` function `n` times, and accumulates results in the same
         * manner you would use with [map]{@link module:Collections.map}.
         *
         * @name times
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.map]{@link module:Collections.map}
         * @category Control Flow
         * @param {number} n - The number of times to run the function.
         * @param {AsyncFunction} iteratee - The async function to call `n` times.
         * Invoked with the iteration index and a callback: (n, next).
         * @param {Function} callback - see {@link module:Collections.map}.
         * @returns {Promise} a promise, if no callback is provided
         * @example
         *
         * // Pretend this is some complicated async factory
         * var createUser = function(id, callback) {
         *     callback(null, {
         *         id: 'user' + id
         *     });
         * };
         *
         * // generate 5 users
         * async.times(5, function(n, next) {
         *     createUser(n, function(err, user) {
         *         next(err, user);
         *     });
         * }, function(err, users) {
         *     // we should now have 5 users
         * });
         */
        function times(n, iteratee, callback) {
          return timesLimit(n, Infinity, iteratee, callback)
        }

        /**
         * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
         *
         * @name timesSeries
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.times]{@link module:ControlFlow.times}
         * @category Control Flow
         * @param {number} n - The number of times to run the function.
         * @param {AsyncFunction} iteratee - The async function to call `n` times.
         * Invoked with the iteration index and a callback: (n, next).
         * @param {Function} callback - see {@link module:Collections.map}.
         * @returns {Promise} a promise, if no callback is provided
         */
        function timesSeries(n, iteratee, callback) {
          return timesLimit(n, 1, iteratee, callback)
        }

        /**
         * A relative of `reduce`.  Takes an Object or Array, and iterates over each
         * element in parallel, each step potentially mutating an `accumulator` value.
         * The type of the accumulator defaults to the type of collection passed in.
         *
         * @name transform
         * @static
         * @memberOf module:Collections
         * @method
         * @category Collection
         * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
         * @param {*} [accumulator] - The initial state of the transform.  If omitted,
         * it will default to an empty Object or Array, depending on the type of `coll`
         * @param {AsyncFunction} iteratee - A function applied to each item in the
         * collection that potentially modifies the accumulator.
         * Invoked with (accumulator, item, key, callback).
         * @param {Function} [callback] - A callback which is called after all the
         * `iteratee` functions have finished. Result is the transformed accumulator.
         * Invoked with (err, result).
         * @returns {Promise} a promise, if no callback provided
         * @example
         *
         * // file1.txt is a file that is 1000 bytes in size
         * // file2.txt is a file that is 2000 bytes in size
         * // file3.txt is a file that is 3000 bytes in size
         *
         * // helper function that returns human-readable size format from bytes
         * function formatBytes(bytes, decimals = 2) {
         *   // implementation not included for brevity
         *   return humanReadbleFilesize;
         * }
         *
         * const fileList = ['file1.txt','file2.txt','file3.txt'];
         *
         * // asynchronous function that returns the file size, transformed to human-readable format
         * // e.g. 1024 bytes = 1KB, 1234 bytes = 1.21 KB, 1048576 bytes = 1MB, etc.
         * function transformFileSize(acc, value, key, callback) {
         *     fs.stat(value, function(err, stat) {
         *         if (err) {
         *             return callback(err);
         *         }
         *         acc[key] = formatBytes(stat.size);
         *         callback(null);
         *     });
         * }
         *
         * // Using callbacks
         * async.transform(fileList, transformFileSize, function(err, result) {
         *     if(err) {
         *         console.log(err);
         *     } else {
         *         console.log(result);
         *         // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
         *     }
         * });
         *
         * // Using Promises
         * async.transform(fileList, transformFileSize)
         * .then(result => {
         *     console.log(result);
         *     // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
         * }).catch(err => {
         *     console.log(err);
         * });
         *
         * // Using async/await
         * (async () => {
         *     try {
         *         let result = await async.transform(fileList, transformFileSize);
         *         console.log(result);
         *         // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * })();
         *
         * @example
         *
         * // file1.txt is a file that is 1000 bytes in size
         * // file2.txt is a file that is 2000 bytes in size
         * // file3.txt is a file that is 3000 bytes in size
         *
         * // helper function that returns human-readable size format from bytes
         * function formatBytes(bytes, decimals = 2) {
         *   // implementation not included for brevity
         *   return humanReadbleFilesize;
         * }
         *
         * const fileMap = { f1: 'file1.txt', f2: 'file2.txt', f3: 'file3.txt' };
         *
         * // asynchronous function that returns the file size, transformed to human-readable format
         * // e.g. 1024 bytes = 1KB, 1234 bytes = 1.21 KB, 1048576 bytes = 1MB, etc.
         * function transformFileSize(acc, value, key, callback) {
         *     fs.stat(value, function(err, stat) {
         *         if (err) {
         *             return callback(err);
         *         }
         *         acc[key] = formatBytes(stat.size);
         *         callback(null);
         *     });
         * }
         *
         * // Using callbacks
         * async.transform(fileMap, transformFileSize, function(err, result) {
         *     if(err) {
         *         console.log(err);
         *     } else {
         *         console.log(result);
         *         // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
         *     }
         * });
         *
         * // Using Promises
         * async.transform(fileMap, transformFileSize)
         * .then(result => {
         *     console.log(result);
         *     // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
         * }).catch(err => {
         *     console.log(err);
         * });
         *
         * // Using async/await
         * async () => {
         *     try {
         *         let result = await async.transform(fileMap, transformFileSize);
         *         console.log(result);
         *         // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
         *     }
         *     catch (err) {
         *         console.log(err);
         *     }
         * }
         *
         */
        function transform(coll, accumulator, iteratee, callback) {
          if (arguments.length <= 3 && typeof accumulator === 'function') {
            callback = iteratee;
            iteratee = accumulator;
            accumulator = Array.isArray(coll) ? [] : {};
          }
          callback = once(callback || promiseCallback());
          var _iteratee = wrapAsync(iteratee);

          eachOf$1(coll, (v, k, cb) => {
            _iteratee(accumulator, v, k, cb);
          }, err => callback(err, accumulator));
          return callback[PROMISE_SYMBOL]
        }

        /**
         * It runs each task in series but stops whenever any of the functions were
         * successful. If one of the tasks were successful, the `callback` will be
         * passed the result of the successful task. If all tasks fail, the callback
         * will be passed the error and result (if any) of the final attempt.
         *
         * @name tryEach
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection containing functions to
         * run, each function is passed a `callback(err, result)` it must call on
         * completion with an error `err` (which can be `null`) and an optional `result`
         * value.
         * @param {Function} [callback] - An optional callback which is called when one
         * of the tasks has succeeded, or all have failed. It receives the `err` and
         * `result` arguments of the last attempt at completing the `task`. Invoked with
         * (err, results).
         * @returns {Promise} a promise, if no callback is passed
         * @example
         * async.tryEach([
         *     function getDataFromFirstWebsite(callback) {
         *         // Try getting the data from the first website
         *         callback(err, data);
         *     },
         *     function getDataFromSecondWebsite(callback) {
         *         // First website failed,
         *         // Try getting the data from the backup website
         *         callback(err, data);
         *     }
         * ],
         * // optional callback
         * function(err, results) {
         *     Now do something with the data.
         * });
         *
         */
        function tryEach(tasks, callback) {
          var error = null;
          var result;
          return eachSeries$1(tasks, (task, taskCb) => {
            wrapAsync(task)((err, ...args) => {
              if (err === false) return taskCb(err);

              if (args.length < 2) {
                [result] = args;
              } else {
                result = args;
              }
              error = err;
              taskCb(err ? null : {});
            });
          }, () => callback(error, result));
        }

        var tryEach$1 = awaitify(tryEach);

        /**
         * Undoes a [memoize]{@link module:Utils.memoize}d function, reverting it to the original,
         * unmemoized form. Handy for testing.
         *
         * @name unmemoize
         * @static
         * @memberOf module:Utils
         * @method
         * @see [async.memoize]{@link module:Utils.memoize}
         * @category Util
         * @param {AsyncFunction} fn - the memoized function
         * @returns {AsyncFunction} a function that calls the original unmemoized function
         */
        function unmemoize(fn) {
          return (...args) => {
            return (fn.unmemoized || fn)(...args);
          };
        }

        /**
         * Repeatedly call `iteratee`, while `test` returns `true`. Calls `callback` when
         * stopped, or an error occurs.
         *
         * @name whilst
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {AsyncFunction} test - asynchronous truth test to perform before each
         * execution of `iteratee`. Invoked with ().
         * @param {AsyncFunction} iteratee - An async function which is called each time
         * `test` passes. Invoked with (callback).
         * @param {Function} [callback] - A callback which is called after the test
         * function has failed and repeated execution of `iteratee` has stopped. `callback`
         * will be passed an error and any arguments passed to the final `iteratee`'s
         * callback. Invoked with (err, [results]);
         * @returns {Promise} a promise, if no callback is passed
         * @example
         *
         * var count = 0;
         * async.whilst(
         *     function test(cb) { cb(null, count < 5); },
         *     function iter(callback) {
         *         count++;
         *         setTimeout(function() {
         *             callback(null, count);
         *         }, 1000);
         *     },
         *     function (err, n) {
         *         // 5 seconds have passed, n = 5
         *     }
         * );
         */
        function whilst(test, iteratee, callback) {
          callback = onlyOnce(callback);
          var _fn = wrapAsync(iteratee);
          var _test = wrapAsync(test);
          var results = [];

          function next(err, ...rest) {
            if (err) return callback(err);
            results = rest;
            if (err === false) return;
            _test(check);
          }

          function check(err, truth) {
            if (err) return callback(err);
            if (err === false) return;
            if (!truth) return callback(null, ...results);
            _fn(next);
          }

          return _test(check);
        }
        var whilst$1 = awaitify(whilst, 3);

        /**
         * Repeatedly call `iteratee` until `test` returns `true`. Calls `callback` when
         * stopped, or an error occurs. `callback` will be passed an error and any
         * arguments passed to the final `iteratee`'s callback.
         *
         * The inverse of [whilst]{@link module:ControlFlow.whilst}.
         *
         * @name until
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @see [async.whilst]{@link module:ControlFlow.whilst}
         * @category Control Flow
         * @param {AsyncFunction} test - asynchronous truth test to perform before each
         * execution of `iteratee`. Invoked with (callback).
         * @param {AsyncFunction} iteratee - An async function which is called each time
         * `test` fails. Invoked with (callback).
         * @param {Function} [callback] - A callback which is called after the test
         * function has passed and repeated execution of `iteratee` has stopped. `callback`
         * will be passed an error and any arguments passed to the final `iteratee`'s
         * callback. Invoked with (err, [results]);
         * @returns {Promise} a promise, if a callback is not passed
         *
         * @example
         * const results = []
         * let finished = false
         * async.until(function test(cb) {
         *     cb(null, finished)
         * }, function iter(next) {
         *     fetchPage(url, (err, body) => {
         *         if (err) return next(err)
         *         results = results.concat(body.objects)
         *         finished = !!body.next
         *         next(err)
         *     })
         * }, function done (err) {
         *     // all pages have been fetched
         * })
         */
        function until(test, iteratee, callback) {
          const _test = wrapAsync(test);
          return whilst$1((cb) => _test((err, truth) => cb(err, !truth)), iteratee, callback);
        }

        /**
         * Runs the `tasks` array of functions in series, each passing their results to
         * the next in the array. However, if any of the `tasks` pass an error to their
         * own callback, the next function is not executed, and the main `callback` is
         * immediately called with the error.
         *
         * @name waterfall
         * @static
         * @memberOf module:ControlFlow
         * @method
         * @category Control Flow
         * @param {Array} tasks - An array of [async functions]{@link AsyncFunction}
         * to run.
         * Each function should complete with any number of `result` values.
         * The `result` values will be passed as arguments, in order, to the next task.
         * @param {Function} [callback] - An optional callback to run once all the
         * functions have completed. This will be passed the results of the last task's
         * callback. Invoked with (err, [results]).
         * @returns {Promise} a promise, if a callback is omitted
         * @example
         *
         * async.waterfall([
         *     function(callback) {
         *         callback(null, 'one', 'two');
         *     },
         *     function(arg1, arg2, callback) {
         *         // arg1 now equals 'one' and arg2 now equals 'two'
         *         callback(null, 'three');
         *     },
         *     function(arg1, callback) {
         *         // arg1 now equals 'three'
         *         callback(null, 'done');
         *     }
         * ], function (err, result) {
         *     // result now equals 'done'
         * });
         *
         * // Or, with named functions:
         * async.waterfall([
         *     myFirstFunction,
         *     mySecondFunction,
         *     myLastFunction,
         * ], function (err, result) {
         *     // result now equals 'done'
         * });
         * function myFirstFunction(callback) {
         *     callback(null, 'one', 'two');
         * }
         * function mySecondFunction(arg1, arg2, callback) {
         *     // arg1 now equals 'one' and arg2 now equals 'two'
         *     callback(null, 'three');
         * }
         * function myLastFunction(arg1, callback) {
         *     // arg1 now equals 'three'
         *     callback(null, 'done');
         * }
         */
        function waterfall(tasks, callback) {
          callback = once(callback);
          if (!Array.isArray(tasks)) return callback(new Error('First argument to waterfall must be an array of functions'));
          if (!tasks.length) return callback();
          var taskIndex = 0;

          function nextTask(args) {
            var task = wrapAsync(tasks[taskIndex++]);
            task(...args, onlyOnce(next));
          }

          function next(err, ...args) {
            if (err === false) return
            if (err || taskIndex === tasks.length) {
              return callback(err, ...args);
            }
            nextTask(args);
          }

          nextTask([]);
        }

        var waterfall$1 = awaitify(waterfall);

        /**
         * An "async function" in the context of Async is an asynchronous function with
         * a variable number of parameters, with the final parameter being a callback.
         * (`function (arg1, arg2, ..., callback) {}`)
         * The final callback is of the form `callback(err, results...)`, which must be
         * called once the function is completed.  The callback should be called with a
         * Error as its first argument to signal that an error occurred.
         * Otherwise, if no error occurred, it should be called with `null` as the first
         * argument, and any additional `result` arguments that may apply, to signal
         * successful completion.
         * The callback must be called exactly once, ideally on a later tick of the
         * JavaScript event loop.
         *
         * This type of function is also referred to as a "Node-style async function",
         * or a "continuation passing-style function" (CPS). Most of the methods of this
         * library are themselves CPS/Node-style async functions, or functions that
         * return CPS/Node-style async functions.
         *
         * Wherever we accept a Node-style async function, we also directly accept an
         * [ES2017 `async` function]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function}.
         * In this case, the `async` function will not be passed a final callback
         * argument, and any thrown error will be used as the `err` argument of the
         * implicit callback, and the return value will be used as the `result` value.
         * (i.e. a `rejected` of the returned Promise becomes the `err` callback
         * argument, and a `resolved` value becomes the `result`.)
         *
         * Note, due to JavaScript limitations, we can only detect native `async`
         * functions and not transpilied implementations.
         * Your environment must have `async`/`await` support for this to work.
         * (e.g. Node > v7.6, or a recent version of a modern browser).
         * If you are using `async` functions through a transpiler (e.g. Babel), you
         * must still wrap the function with [asyncify]{@link module:Utils.asyncify},
         * because the `async function` will be compiled to an ordinary function that
         * returns a promise.
         *
         * @typedef {Function} AsyncFunction
         * @static
         */

        var index = {
          apply,
          applyEach: applyEach$1,
          applyEachSeries,
          asyncify,
          auto,
          autoInject,
          cargo,
          cargoQueue: cargo$1,
          compose,
          concat: concat$1,
          concatLimit: concatLimit$1,
          concatSeries: concatSeries$1,
          constant,
          detect: detect$1,
          detectLimit: detectLimit$1,
          detectSeries: detectSeries$1,
          dir,
          doUntil,
          doWhilst: doWhilst$1,
          each,
          eachLimit: eachLimit$2,
          eachOf: eachOf$1,
          eachOfLimit: eachOfLimit$2,
          eachOfSeries: eachOfSeries$1,
          eachSeries: eachSeries$1,
          ensureAsync,
          every: every$1,
          everyLimit: everyLimit$1,
          everySeries: everySeries$1,
          filter: filter$1,
          filterLimit: filterLimit$1,
          filterSeries: filterSeries$1,
          forever: forever$1,
          groupBy,
          groupByLimit: groupByLimit$1,
          groupBySeries,
          log,
          map: map$1,
          mapLimit: mapLimit$1,
          mapSeries: mapSeries$1,
          mapValues,
          mapValuesLimit: mapValuesLimit$1,
          mapValuesSeries,
          memoize,
          nextTick,
          parallel: parallel$1,
          parallelLimit,
          priorityQueue,
          queue: queue$1,
          race: race$1,
          reduce: reduce$1,
          reduceRight,
          reflect,
          reflectAll,
          reject: reject$2,
          rejectLimit: rejectLimit$1,
          rejectSeries: rejectSeries$1,
          retry,
          retryable,
          seq,
          series,
          setImmediate: setImmediate$1,
          some: some$1,
          someLimit: someLimit$1,
          someSeries: someSeries$1,
          sortBy: sortBy$1,
          timeout,
          times,
          timesLimit,
          timesSeries,
          transform,
          tryEach: tryEach$1,
          unmemoize,
          until,
          waterfall: waterfall$1,
          whilst: whilst$1,

          // aliases
          all: every$1,
          allLimit: everyLimit$1,
          allSeries: everySeries$1,
          any: some$1,
          anyLimit: someLimit$1,
          anySeries: someSeries$1,
          find: detect$1,
          findLimit: detectLimit$1,
          findSeries: detectSeries$1,
          flatMap: concat$1,
          flatMapLimit: concatLimit$1,
          flatMapSeries: concatSeries$1,
          forEach: each,
          forEachSeries: eachSeries$1,
          forEachLimit: eachLimit$2,
          forEachOf: eachOf$1,
          forEachOfSeries: eachOfSeries$1,
          forEachOfLimit: eachOfLimit$2,
          inject: reduce$1,
          foldl: reduce$1,
          foldr: reduceRight,
          select: filter$1,
          selectLimit: filterLimit$1,
          selectSeries: filterSeries$1,
          wrapSync: asyncify,
          during: whilst$1,
          doDuring: doWhilst$1
        };

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (index);



        /***/
      }),

/***/ "./package.json":
/*!**********************!*\
  !*** ./package.json ***!
  \**********************/
/***/ ((module) => {

        "use strict";
        module.exports = JSON.parse('{"name":"web-arduino-uploader","version":"1.1.2","main":"dist/index.ts","types":"dist/index.d.ts","license":"MIT","author":{"name":"David Buezas","email":"david.buezas@gmail.com","url":"https://github.com/dbuezas/arduino-web-uploader/"},"scripts":{"prepublish":"npm run build","build":"tsc && webpack"},"devDependencies":{"@types/node":"^14.18.22","@typescript-eslint/eslint-plugin":"^4.5.0","@typescript-eslint/parser":"^4.5.0","buffer":"^5.6.1","eslint":"^7.12.0","prettier":"^2.1.2","process":"^0.11.10","stream-browserify":"^3.0.0","typescript":"^4.0.3","webpack":"^5.74.0","webpack-cli":"^4.10.0"},"dependencies":{"async":"^3.2.0","intel-hex":"^0.1.2","readable-web-to-node-stream":"^2.0.0","stk500":"github:dbuezas/js-stk500v1#v3.0.0"}}');

        /***/
      })

    /******/
  });
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
      /******/
    }
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
      /******/
    };
/******/
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
    /******/
  }
/******/
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for (var key in definition) {
/******/ 				if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
          /******/
        }
        /******/
      }
      /******/
    };
    /******/
  })();
/******/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function () {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
        /******/
      } catch (e) {
/******/ 				if (typeof window === 'object') return window;
        /******/
      }
      /******/
    })();
    /******/
  })();
/******/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
    /******/
  })();
/******/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
        /******/
      }
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
      /******/
    };
    /******/
  })();
  /******/
  /************************************************************************/
  var __webpack_exports__ = {};
  // This entry need to be wrapped in an IIFE because it need to be in strict mode.
  (() => {
    "use strict";
    var exports = __webpack_exports__;
    /*!**********************!*\
      !*** ./dist/test.js ***!
      \**********************/

    Object.defineProperty(exports, "__esModule", ({ value: true }));
    const _1 = __webpack_require__(/*! ./ */ "./dist/index.js");
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[arduino-uploader]').forEach((el) => {
        el.addEventListener('click', async () => {
          if (!navigator.serial)
            return alert('Error: Web Serial needs to be available. Please use Chrome, Opera, or Edge, and make sure Web Serial is enabled.');
          const hexHref = el.getAttribute('hex-href');
          const board = el.getAttribute('board');
          const verify = el.hasAttribute('verify');
          const progressEl = el.querySelector('.upload-progress');
          const onProgress = (progress) => {
            progressEl.innerHTML = `${progress}%`;
          };
          let portFilters = {};
          try {
            portFilters = { filters: JSON.parse(el.getAttribute('port-filters')) || [] };
          }
          catch (e) { }
          try {
            await _1.upload(_1.boards[board], hexHref, onProgress, verify, portFilters);
          }
          catch (e) {
            progressEl.innerHTML = 'Error!';
            // alert(e);
            throw e;
          }
          progressEl.innerHTML = 'Done!';
          console.log("Upload successful!\n Thanks to: https://github.com/dbuezas/arduino-web-uploader");
        });
      });
    });
    //# sourceMappingURL=test.js.map
  })();

  /******/
})()
  ;

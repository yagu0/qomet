var Sha1 = {};  // SHA-1 namespace

// SHA-1 algorithm as described at http://en.wikipedia.org/wiki/SHA-1
// The implementation follows http://fr.wikipedia.org/wiki/Sp%C3%A9cifications_SHA-1 (in french).
// SHA-1 implementation of Chris Veness 2002-2010 [www.movable-type.co.uk] helped a lot for debugging,
// and for hacks like toHexStr(). See his script at http://www.movable-type.co.uk/scripts/sha1.html
Sha1.Compute = function(subject)
{
	var i, j, tmp, redIndex, a, b, c, d, e;

	// 1) pretreatment

	// note: no check on message length, since the 2^64 boundary is
	// a lot longer than what would be allowed by HTML/PHP

	// add trailing '1' bit (+ 0's padding) to string
	subject += String.fromCharCode(0x80);

	// add 8 for two last reserved words to store message length
	// 8 = 2 x 4, one 32-bits word is 4 characters (bytes) length.
	var L = subject.length + 8;

	// initialize 512-bits blocks representing the message, each containing 16 32-bits words.
	// NOTE: one char is 8 bits, so one block in the initial string is 64 chars.
	var countBlocks = Math.ceil(L / 64);
	var blocks = new Array(countBlocks);
	for (i=0; i<countBlocks; i++)
	{
		var words = new Array(16);
		for (j=0; j<16; j++)
		{
			tmp = subject.substr(64 * i + 4 * j, 4);
			// note: running off the end of msg is ok because bitwise ops on NaN return 0
			words[j] = (1 << 24) * tmp.charCodeAt(0) | (1 << 16) * tmp.charCodeAt(1) | (1 << 8) * tmp.charCodeAt(2) | tmp.charCodeAt(3);
		}
		blocks[i] = words;
	}

	// note: 'subject' in our context will never be of length >= 2^32.
	// therefore we don't need to fill before-last block.
	blocks[countBlocks-1][15] = (subject.length-1) * 8;

	// initialize parts of the final hash
	var h0 = 0x67452301;
	var h1 = 0xefcdab89;
	var h2 = 0x98badcfe;
	var h3 = 0x10325476;
	var h4 = 0xc3d2e1f0;

	// initialize constants array
	var k = [0x5a827999,0x6ed9eba1,0x8f1bbcdc,0xca62c1d6];

	// 2) computations

	for (i=0; i<blocks.length; i++)
	{
		// initialize w array
		var w = new Array(80);
		for (j=0; j<16; j++) w[j] = blocks[i][j];
		for (j=16; j<80; j++)
			w[j] = Sha1.LeftRotate(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);

		// initialize a,b,c,d,e variables
		a = h0;
		b = h1;
		c = h2;
		d = h3;
		e = h4;

		// iterations over a,b,c,d,e
		for (j=0; j<80; j++)
		{
			// note: '& 0xffffffff' == 'modulo 2^32'.
			redIndex = Math.floor(j/20);
			tmp = (Sha1.LeftRotate(a, 5) + Sha1.BitOp(b, c, d, redIndex) + e + k[redIndex] + w[j]) & 0xffffffff;
			e = d;
			d = c;
			c = Sha1.LeftRotate(b, 30);
			b = a;
			a = tmp;
		}

		// update intermediate hash values
		h0 = (h0+a) & 0xffffffff;
		h1 = (h1+b) & 0xffffffff;
		h2 = (h2+c) & 0xffffffff;
		h3 = (h3+d) & 0xffffffff;
		h4 = (h4+e) & 0xffffffff;
	}

	return Sha1.ToHexStr(h0)+Sha1.ToHexStr(h1)+Sha1.ToHexStr(h2)+Sha1.ToHexStr(h3)+Sha1.ToHexStr(h4);
}

// auxiliary functions.
Sha1.BitOp = function(x, y, z, t)
{
	if (t == 0) return (x & y) ^ (~x & z);
	if (t == 1) return x ^ y ^ z;
	if (t == 2) return (x & y) ^ (x & z) ^ (y & z);
	if (t == 3) return x ^ y ^ z;
}

// left rotation (within 32 bits).
Sha1.LeftRotate = function(x, n)
{
	return (x << n) | (x >>> (32 - n));
}

// [copy-pasted from Chris Veness implementation]
// Hexadecimal representation of a number
// (note toString(16) is implementation-dependant, and
// in IE returns signed numbers when used on full words)
Sha1.ToHexStr = function(x)
{
	var s="";
	for (var i=7; i>=0; i--)
	{
		var v = (x >>> (i*4)) & 0xf;
		s += v.toString(16);
	}
	return s;
}

try { module.exports = Sha1; } catch (err) {}

const { z } = require('zod');
const s = z.union([z.string(), z.any()]);
console.log(s.safeParse({label:'A',value:'B'}));

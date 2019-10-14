import * as N3 from 'n3';
import * as yarrrmlParser from '@rmlio/yarrrml-parser/lib/rml-generator';
import * as rmlMapperNode from 'rocketrml';

export const yarrrmlParse = (yaml: string): Promise<string> =>
  new Promise((resolve) => {
    const y2r = new yarrrmlParser();
    const yamlQuads = y2r.convert(yaml);
    let prefixes = {
      rr: 'http://www.w3.org/ns/r2rml#',
      rml: 'http://semweb.mmlab.be/ns/rml#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      schema: 'http://schema.org/',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      fnml: 'http://semweb.mmlab.be/ns/fnml#',
      fno: 'http://w3id.org/function/ontology#',
      mex: 'http://mapping.example.com/',
    };
    prefixes = Object.assign({}, prefixes, y2r.getPrefixes());

    const writer = new N3.Writer({ prefixes });
    writer.addQuads(yamlQuads);
    writer.end((_: any, result: any) => {
      resolve(result);
    });
  });

export const runRmlMapping = async (
  mappingFile: string,
  inputFile: string,
  options: any,
) => {
  return rmlMapperNode.parseFileLive(
    mappingFile,
    { input: inputFile },
    options,
  );
};

//  - [ex:name, {mapping: thumbnail, join: [asd, asd]}]
// -->
//  - [ex:name,  {mapping:geo, condition:{function:equal,parameters:[[str1,$(firstname)],[str2,$(firstname)]]}}]

// - [schema:geo, {function: myfunc:toUpperCase, parameters: [$(title), $(foo)]}]
// -->
// - [schema:geo, {function: myfunc:toUpperCase, parameters: [[ex:str1, $(title)], [ex:str2, $(foo)]]}]

export const yarrrmlExtend = (yarrrml: string): string => {
  // replace function
  let str = yarrrml.replace(
    /((?:parameters|pms): *\[)([\w@\^\.\/\$\(\)\"\' ,\[\]\|\=]+)(\])/g,
    (...e) => {
      const [, cg1, cg2, cg3] = e as [string, string, string, string];
      const params = cg2
        .split(',')
        .map((el, i) => `[schema:str${i}, ${el.trim()}]`)
        .join(', ');
      return cg1 + params + cg3;
    },
  );
  // replace join
  str = str.replace(
    /join: *\[ *"?([\w@\^\.\/\$\:\-\*\,\ \'\)\()]+)"? *, *"?([\w@\^\.\/\$\:\-\*\,\ \'\(\)]+)"? *\]/g,
    'condition:{function:equal,parameters:[[str1,"$($1)"],[str2,"$($2)"]]}',
  );
  return str;
};

// name$LBR.$RBR -> name(.)
const escapeTable = {
  '(': '\\$LBR',
  ')': '\\$RBR',
  '{': '\\$LCB',
  '}': '\\$RCB',
};

const yarrrmlEncodeBrackets = (str: string) => {
  let level = 0;
  let ret = '';

  for (let i = 0; i < str.length; i += 1) {
    const c = str[i];

    if (level < 0) {
      throw new Error('failed parsing brackets');
    }

    if (level === 0) {
      switch (c) {
        case '$':
          if (str[i + 1] === '(') {
            level += 1;
            i += 1;
            ret += '$(';
          } else {
            ret += c;
          }
          break;
        case '(':
        case ')':
        default:
          ret += c;
      }
    } else {
      switch (c) {
        case '(':
          level += 1;
          ret += '$LBR';
          break;
        case ')':
          level -= 1;
          if (level === 0) {
            ret += ')';
          } else {
            ret += '$RBR';
          }
          break;
        default:
          ret += c;
      }
    }
  }
  return ret;
};

// console.log(yarrrmlEncodeBrackets('asd$(fii) fds $(fs(name(), conc(foo, my, "fellow"))g) why'));

export const decodeRMLReplacements = (rml: string) =>
  Object.entries(escapeTable).reduce(
    (str, [char, code]) => str.replace(new RegExp(code, 'g'), char),
    rml,
  );

export const yarrrmlPlusToRml = async (yarrrml: string): Promise<string> => {
  let mappingStr = yarrrmlExtend(yarrrml);
  mappingStr = yarrrmlEncodeBrackets(mappingStr);
  mappingStr = await yarrrmlParse(mappingStr);
  mappingStr = decodeRMLReplacements(mappingStr);
  return mappingStr;
};

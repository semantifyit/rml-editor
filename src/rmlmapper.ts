import N3 from 'n3';
import yarrrml from '@rmlio/yarrrml-parser/lib/yarrrml2rml';
import rmlMapperNode from 'rml-mapper-nodejs';


export const yarrrmlParse = (yaml: string): Promise<string> => 
    new Promise((resolve) => {
        const y2r = new yarrrml();
        const yamlQuads = y2r.convert(yaml);
        const writer = N3.Writer({
            rr: 'http://www.w3.org/ns/r2rml#',
            rdf:'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
            fnml: "http://semweb.mmlab.be/ns/fnml#",
            fno: "http://w3id.org/function/ontology#"
        });
        writer.addQuads(yamlQuads);
        writer.end((_: any, result: any) => {
            resolve(result);
        });
    });


export const parseFile = async (mappingFile: string, inputFile: string, options:any, inputType:string) => {
    return rmlMapperNode.parseFileLive(mappingFile, {[`input.${inputType}`]: inputFile}, options);
}


//  - [ex:name, {mapping: thumbnail, join: [asd, asd]}]
// -->
//  - [ex:name,  {mapping:geo, condition:{function:equal,parameters:[[str1,$(firstname)],[str2,$(firstname)]]}}]


// - [schema:geo, {function: myfunc:toUpperCase, parameters: [$(title), $(foo)]}]
// -->
// - [schema:geo, {function: myfunc:toUpperCase, parameters: [[ex:str1, $(title)], [ex:str2, $(foo)]]}]


export const yarrrmlExtend = (yarrrml: string): string => {
    // replace join
    let str = yarrrml.replace(/((?:parameters|pms): *\[)([\w@\^\.\/\$\(\)\"\' ,\[\]]+)(\])/g,
    (...e) => {
        const [, cg1, cg2, cg3] = e as [string,string,string,string];
        const params = cg2.split(',').map((e, i) => `[schema:str${i}, ${e.trim()}]`).join(', ')
        return cg1 + params + cg3;
    });
    str = yarrrml.replace(/join: *\[ *([\w@\^\.\/]+) *, *([\w@\^\.\/]+) *\]/g, 'condition:{function:equal,parameters:[[str1,$($1)],[str2,$($2)]]}');
    return str;
}

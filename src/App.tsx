import React, { useState } from 'react';
import AceEditor from 'react-ace';

import "ace-builds/webpack-resolver";
import "ace-builds/src-noconflict/ext-searchbox"
import "ace-builds/src-noconflict/mode-javascript"
import "ace-builds/src-noconflict/mode-json"
import "ace-builds/src-noconflict/mode-yaml"
import "ace-builds/src-noconflict/mode-turtle"
import "ace-builds/src-noconflict/mode-xml"
import "ace-builds/src-noconflict/theme-dracula"

import './App.css';

import { runRmlMapping, yarrrmlPlusToRml } from './rmlmapper';
import { downloadString } from './util';

const initialMapping = `prefixes:
  schema: "http://schema.org/"
  myfunc: "http://myfunc.com/"
mappings:
  person:
    sources:
      - ['input~jsonpath', '$.persons[*]']
    s: http://example.com/$(firstname)
    po:
      - [a, schema:Person]
      - [schema:name, $(firstname)]
      - [schema:language, $(speaks.*)]
`;

const initialInput = `{
  "persons": [
      {
          "firstname": "John",
          "lastname": "Doe",
          "speaks": [
              "de",
              "en"
          ]
      },
      {
          "firstname": "Jane",
          "lastname": "Smith",
          "speaks": [
              "fr",
              "es"
          ]
      }
  ]
}`;
const initialFunctions =
`(() => {
  // define your function namespace here:
  const namespace = 'http://myfunc.com/';
  
  // your functions: (input is an array)
  const toUpperCase = ([str]) => {
    return str.toString().toUpperCase();
  };
  

  // array of all functions you want to export
  const functionToExport = [toUpperCase];

  return functionToExport.reduce((acc, cur) => {acc[namespace + cur.name] = cur; return acc;}, {});
})();
`;

// window.onbeforeunload = function() {
//   return true;
// };



const App = () => {
  const [mapping, setMapping] = useState(initialMapping);
  const [input, setInput] = useState(initialInput);
  const [functions, setFunctions] = useState(initialFunctions);
  const [output, setOutput] = useState('');
  const [inputType, setInputType] = useState('json');
  const [outputType, setOutputType] = useState('json');
  const [rmlType, setRmlType] = useState('yaml');
  const [runOnChange, setRunOnChange] = useState(false);
  const [showFunctions, setShowFunctions] = useState(false);

  const runMapping = async () => {
    console.time("time")
    try {
      let mappingStr = mapping;

      if (rmlType === 'yaml') {
        mappingStr = await yarrrmlPlusToRml(mappingStr);
      }
      const result = await runRmlMapping(mappingStr,
        input,
        {
          toRDF: (outputType==='turtle'),
          replace: true,
          compress: {
           '@vocab':"http://schema.org/",
          },
          // eslint-disable-next-line no-eval
          functions: eval(functions),
        });
      setOutput(outputType==='turtle' ? result : JSON.stringify(result, null, 2));
    } catch (e) {
      console.log(e);
      setOutput(e.toString());
    }
    console.timeEnd("time")

  }

  const saveRML = async () => {
    const downloadRmlStr = await yarrrmlPlusToRml(mapping);
    downloadString(downloadRmlStr, 'ttl', 'mapping_rml.ttl');
  }

  if(runOnChange){
    runMapping();
  }

  const click = () =>
    runMapping();

  return (
      <div className="App">
        <header className="App-header">
          <h1>Welcome to RMHell!!</h1>

          <button className="button" onClick={click}>RUN</button>

          <div className="grid">
            <div className="width-auto">
            <h3>Yarrml / RML-ttl</h3>
              <AceEditor
                fontSize={14}
                mode={rmlType}
                theme="dracula"
                value={mapping}
                onChange={(e) => setMapping(e)}
                name="yarrrml"
                editorProps={{$blockScrolling: true}}
                showPrintMargin={false}
                width="auto"
              />
            </div>
            {showFunctions && (
              <div className="width-auto">
              <h3>JS Functions</h3>
                <AceEditor
                  fontSize={14}
                  mode="javascript"
                  theme="dracula"
                  value={functions}
                  onChange={(e) => setFunctions(e)}
                  name="functions"
                  editorProps={{$blockScrolling: true}}
                  showPrintMargin={false}
                  width="auto"
                />
              </div>
            )}
            <div className="width-auto">
              <h3>Input({`.${inputType}`})</h3>
              <AceEditor
                fontSize={14}
                mode={inputType}
                theme="dracula"
                value={input}
                onChange={(e) => setInput(e)}
                name="input"
                width="auto"
                editorProps={{$blockScrolling: true}}
                showPrintMargin={false}
              />
            </div>
            <div className="width-auto" style={!showFunctions ? {gridColumn: "1 / 3"}: {}}>
              <h3>Output</h3>
              <AceEditor
                fontSize={14}
                mode={outputType}
                theme="dracula"
                value={output}
                name="output"
                editorProps={{$blockScrolling: true}}
                width="auto"
                readOnly={true}
                showPrintMargin={false}
              />
            </div>
            <div className="width-auto" style={{gridColumn: "1 / 3"}}>
              <h3>Settings</h3>
              <span className="marginRight">
                RML type:
                <select value={rmlType} onChange={(e) => setRmlType(e.target.value)}>
                  <option value="yaml">Yarrrml</option>
                  <option value="turtle">RML-turtle</option>
                </select>
              </span>
              <span className="marginRight">
                Input type:
                <select value={inputType} onChange={(e) => setInputType(e.target.value)}>
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                  <option value="text">CSV</option>
                </select>
              </span>
              <span className="marginRight">
                Output type:
                <select value={outputType} onChange={(e) => setOutputType(e.target.value)}>
                  <option value="json">JSON-LD</option>
                  <option value="turtle">N-Tripples</option>
                </select>
              </span>
              <span className="marginRight">
                <input type="checkbox" name="runMapperOnChange" checked={showFunctions} onChange={(e) => setShowFunctions(!showFunctions)}/> Show functions
              </span>
              <input type="checkbox" name="runMapperOnChange" checked={runOnChange} onChange={(e) => setRunOnChange(!runOnChange)}/> Run mapper on change
              <br/>
              <button className="button small" onClick={saveRML}>Download RML</button>
            </div>
          </div>
          <div className="footer"/>
        </header>
      </div>
    );
}

export default App;

// Convert Office files through LibreOffice, updating live TOC and REF fields.
// The small local worker extension dispatches standard UNO update commands;
// it does not replace the office layout or PDF export implementation.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=process.env.REPORT_OFFICE_PACKAGE || join(root,'.local/report-tools/node/node_modules/@deepseek-ai/libreoffice-kit');
const worker=join(pkg,'lib/worker.js');
const marker='// Report-build extension: update live Word TOC/fields before serializing.';
let source=readFileSync(worker,'utf8');
if(!source.includes(marker)){
  const original='return withWasmSession(request, (session) => {\n\t\tconst { module, office, document } = session;';
  const replacement=`return withWasmSession(request, async (session) => {
		const { module, office, document } = session;
		${marker}
		module.ccall("dsh_lok_document_initialize_rendering", "number", ["number"], [document]);
		module.ccall("dsh_lok_document_listen", "number", ["number"], [document]);
		await session.idle();
		for (const command of [".uno:UpdateFields", ".uno:UpdateAllIndexes", ".uno:UpdateAll"]) {
			module.ccall("dsh_lok_document_command", "number", ["number","string","string"], [document,command,"{}"]);
			await session.idle();
		}`;
  if(!source.includes(original)) throw new Error('Unexpected converter worker; use pinned version 0.2.3 or native LibreOffice.');
  writeFileSync(worker,source.replace(original,replacement));
}
const {createConverter}=await import(pathToFileURL(join(pkg,'lib/index.js')).href);
const inputPath=resolve(process.argv[2]||'');
const outputPath=resolve(process.argv[3]||'');
if(!process.argv[3] || !existsSync(inputPath) || existsSync(outputPath)) throw new Error('Usage: node report_source/convert_report.mjs EXISTING_INPUT FRESH_OUTPUT');
const converter=await createConverter({
  fontDirectories:[process.env.REPORT_FONT_DIR || join(root,'.local/report-fonts'),'/usr/share/fonts/truetype/dejavu'],
  initialFontFamilies:['Arial','Times New Roman'],
  timeoutMs:240000,
  maxImageResolution:300
});
try{
  const result=await converter.convert({inputPath,outputPath});
  if(result.missingFonts.length) throw new Error('Missing fonts: '+result.missingFonts.join(', '));
  console.log(JSON.stringify({inputPath,outputPath,...result},null,2));
}finally{await converter.dispose();}

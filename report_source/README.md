# AptiTest academic report — source and verification

## Final deliverables

The only final deliverables are the two separate files in `../AptiTest_Report_Output/`:

- `AptiTest_Mini_Project_Report.docx` — editable Word document, with embedded fonts, a populated live TOC, heading styles, real tables and figure cross-references.
- `AptiTest_Mini_Project_Report.pdf` — exported from that exact finished DOCX, not separately authored.

Both have **38 visible A4 pages**: five front-matter pages (cover i, unprinted; certificate ii; abstract iii; TOC iv–v) and 33 Arabic-numbered main pages. Mirror margins support duplex printing. Instructor/HOD signature spaces are intentionally unsigned.

## Authorities and provenance

- Technical source: **MKSubrahmanya12345/Aptitest-JSF**, revision `d23b6e798b4c82222642ab03a7ba9f8f1b72163c`. This is deliberately not inferred from the different application checkout containing this report.
- The official attachment was `JSF_MP_Report_Template_New_2026-27_SEC_B.pdf`, not the requested original DOCX. Its identity, banners, cover/certificate hierarchy and chapter organization were recreated as editable content and adapted from Letter to the explicitly requested A4 size.
- The unrelated `Report.pdf` was a presentation reference only. No people, project data, diagrams or screenshots were copied from it.
- `assets/screenshots/01` through `06` are unchanged captures from the technical repository. Three additional files are exact rectangular crops, explicitly identified in captions. `source_evidence.json` records their original hashes and dimensions.
- The three technical diagrams are reconstructed from the inspected implementation using `make_diagrams.py`. They are not fabricated application screens.

## Verification actually performed

`qa_results.json` records **2,707 passing document checks**, including:

- DOCX ZIP integrity, A4 geometry, three numbering sections, Arial 12/1.5 body settings, populated TOC and embedded font inventory;
- all planned prose, headings, captions and table-cell content on their intended PDF pages;
- all 50 cached TOC entries against PDF text and actual section pages;
- identity/order, removal of sample placeholders, figure counts, image proportions and safe page bounds;
- rendering every PDF page and visually reviewing the complete set of contact sheets, with detailed inspection of cover, certificate, TOC, diagrams, tables, screenshots and references;
- a second independent export from the final DOCX, matching all 38 pages in text and raster pixels at the same comparison scale.

`audit_source.py` independently recounts the seed JSON and checks declared stack, seeded templates, entity/test-source inventory, unchanged screenshot files and exact crops. It does **not** execute the application. The **61 Java cases and 47 HTTP checks** are the technical repository's documented execution results, clearly attributed in the report. They were **not rerun for report preparation**. MySQL, SendGrid delivery, live Razorpay, production load and formal security/accessibility certification remain unverified.

## Reproduction

Dependencies are intentionally not checked into Git. The normal deliverables and required assets/scripts are outside `.local`; large tool/runtime caches and review PNGs stay inside `.local`.

1. Install `requirements.txt` in a Python environment.
2. Supply the pinned technical source at `.local/technical-source` (only needed for the static source audit).
3. Supply Arial regular/bold/italic/bold-italic, Times New Roman regular/bold and Algerian in `.local/report-fonts` (or set `REPORT_FONT_DIR`). Use legally available fonts. The final DOCX embeds the permitted report faces; standalone font binaries are not published here. The certificate font subset came from the supplied template.
4. Use Node 22.19+ and install the pinned Office wrapper/engine:

```sh
npm install --prefix .local/report-tools/node --no-audit --no-fund \
  @deepseek-ai/libreoffice-kit@0.2.3 @deepseek-ai/libreoffice-kit-wasm@0.2.3
python3 report_source/audit_source.py
python3 report_source/make_diagrams.py
python3 report_source/build_report.py
```

The converter requires **fresh, nonexistent output paths**. Move aside previous final files and the previous private reconversion before rebuilding; never overwrite the report's source assets. Then:

```sh
node report_source/convert_report.mjs \
  .local/report-scratch/AptiTest_Report_Draft.docx \
  AptiTest_Report_Output/AptiTest_Mini_Project_Report.docx
python3 report_source/finalize_docx.py
node report_source/convert_report.mjs \
  AptiTest_Report_Output/AptiTest_Mini_Project_Report.docx \
  AptiTest_Report_Output/AptiTest_Mini_Project_Report.pdf
node report_source/convert_report.mjs \
  AptiTest_Report_Output/AptiTest_Mini_Project_Report.docx \
  .local/report-qa/independent-reconversion.pdf
python3 report_source/verify_report.py
```

The converter's small local worker extension dispatches standard LibreOffice UNO field/index update commands before saving. LibreOffice performs the document layout and PDF export. `finalize_docx.py` only embeds permitted fonts, enables Word field updates and corrects the cached page total to the verified visible count; it never writes a PDF. Review renders are regenerated in `.local/report-qa/`.

If the report is edited, regenerate the PDF from the changed DOCX and recheck TOC, pagination and figures. The expected 38-page assertions intentionally describe this delivered revision, not arbitrary future edits. Pagination was verified with the supplied LibreOffice conversion engine, not independently in every version of Microsoft Word.

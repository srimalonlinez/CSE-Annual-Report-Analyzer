# Usage: python scripts/make-fixture.py out.pdf [industrial|bank|insurer]
# Builds test-fixtures/sample-report.pdf: a small text PDF laid out like a Sri Lankan annual report.
import sys
L=lambda label,*v:(label,v)
INDUSTRIAL=[
 ("Independent Auditor's Report",[("Opinion",()),("We have audited the financial statements of Sample PLC.",()),("In our opinion the financial statements give a true and fair view.",()),("Key Audit Matters",())]),
 ("Statement of Profit or Loss",[("Group",()),("Rs. '000",()),L("Revenue","10,000,000","9,000,000"),L("Cost of sales","(6,000,000)","(5,500,000)"),L("Gross profit","4,000,000","3,500,000"),
   L("Other income","100,000","80,000"),L("Distribution expenses","(500,000)","(450,000)"),L("Administrative expenses","(800,000)","(700,000)"),
   L("Results from operating activities","2,800,000","2,430,000"),L("Finance costs","(300,000)","(250,000)"),L("Profit before tax","2,500,000","2,180,000"),
   L("Income tax expense","(750,000)","(654,000)"),L("Profit for the year","1,750,000","1,526,000"),L("Basic earnings per share","3.50","3.05")]),
 ("Statement of Financial Position",[("Group",()),("Rs. '000",()),L("Property, plant and equipment","5,000,000","4,800,000"),L("Right-of-use assets","400,000","420,000"),
   L("Intangible assets","100,000","90,000"),L("Inventories","2,000,000","1,800,000"),L("Trade and other receivables","2,500,000","2,200,000"),
   L("Cash and cash equivalents","500,000","610,000"),L("Total current assets","5,000,000","4,610,000"),L("Total assets","10,500,000","9,920,000")]),
 ("Statement of Financial Position (Contd.)",[("Group",()),("Rs. '000",()),L("Stated capital","2,000,000","2,000,000"),L("Retained earnings","3,500,000","3,100,000"),
   L("Total equity","5,500,000","5,100,000"),L("Interest bearing borrowings","1,200,000","1,300,000"),L("Lease liabilities","350,000","380,000"),
   L("Interest bearing borrowings","800,000","700,000"),L("Lease liabilities","60,000","55,000"),L("Bank overdraft","100,000","90,000"),
   L("Trade and other payables","1,500,000","1,400,000"),L("Total current liabilities","2,460,000","2,245,000"),L("Total liabilities","5,000,000","4,820,000"),
   L("Total equity and liabilities","10,500,000","9,920,000")]),
 ("Statement of Cash Flows",[("Group",()),("Rs. '000",()),("Cash flows from operating activities",()),L("Profit before tax","2,500,000","2,180,000"),
   L("Depreciation of property, plant and equipment","400,000","380,000"),L("Amortisation of intangible assets","20,000","18,000"),
   L("Increase in inventories","(200,000)","(100,000)"),L("Increase in receivables","(300,000)","(150,000)"),
   L("Net cash generated from operating activities","2,000,000","1,900,000"),L("Purchase of property, plant and equipment","(600,000)","(550,000)"),
   L("Dividends paid","(500,000)","(400,000)"),L("Repayment of borrowings","(100,000)","(90,000)")]),
 ("Notes to the Financial Statements",[("1. Corporate information",()),("Related party transactions",()),("Contingent liabilities",())]),
]
BANK=[
 ("Independent Auditor's Report",[("Opinion",()),("In our opinion the financial statements give a true and fair view.",()),("Key Audit Matters",())]),
 ("Income Statement",[("Group",()),("Rs. Mn",()),L("Gross income","320,000","300,000"),L("Interest income","290,000","272,000"),L("Less: Interest expenses","(170,000)","(167,000)"),
   L("Net interest income","120,000","105,000"),L("Fee and commission income","28,000","25,000"),L("Net fee and commission income","25,000","22,000"),
   L("Net gains from trading","3,000","2,500"),L("Total operating income","160,000","140,000"),L("Less: Impairment charges","(15,000)","(18,000)"),
   L("Net operating income","145,000","122,000"),L("Total operating expenses","(60,000)","(55,000)"),
   L("Operating profit before taxes on financial services","85,000","67,000"),L("Taxes on financial services","(15,000)","(12,000)"),
   L("Profit before income tax","70,000","55,000"),L("Income tax expense","(25,000)","(20,000)"),L("Profit for the year","45,000","35,000"),
   L("Basic earnings per ordinary share","100.00","80.00")]),
 ("Statement of Financial Position",[("Group",()),("Rs. Mn",()),L("Cash and cash equivalents","50,000","40,000"),L("Balances with Central Bank","60,000","55,000"),
   L("Placements with banks","30,000","28,000"),L("Financial assets at amortised cost - loans and advances to customers","1,600,000","1,450,000"),
   L("Financial assets at amortised cost - debt instruments","600,000","580,000"),L("Property, plant and equipment","40,000","38,000"),
   L("Total assets","2,500,000","2,300,000"),L("Due to banks","40,000","45,000"),L("Financial liabilities at amortised cost - due to depositors","1,900,000","1,750,000"),
   L("Debt securities issued","60,000","55,000"),L("Subordinated term debts","50,000","50,000"),L("Total liabilities","2,250,000","2,080,000"),
   L("Stated capital","50,000","50,000"),L("Retained earnings","150,000","125,000"),L("Total equity","250,000","220,000"),
   L("Total equity and liabilities","2,500,000","2,300,000")]),
 ("Notes to the Financial Statements",[("1. Reporting entity",()),("Hatton-like Bank PLC is a licensed commercial bank.",()),("Related party transactions",())])]
INSURER=[
 ("Independent Auditor's Report",[("Opinion",()),("Key Audit Matters",())]),
 ("Statement of Profit or Loss",[("Group",()),("Rs. '000",()),L("Insurance revenue","20,000,000","18,000,000"),L("Insurance service expenses","(15,000,000)","(14,000,000)"),
   L("Net expenses from reinsurance contracts held","(1,500,000)","(1,200,000)"),L("Insurance service result","3,500,000","2,800,000"),
   L("Investment income","4,000,000","3,800,000"),L("Net insurance finance expenses","(2,000,000)","(1,900,000)"),L("Other income","100,000","90,000"),
   L("Other operating and administrative expenses","(600,000)","(590,000)"),L("Profit before tax","5,000,000","4,200,000"),
   L("Income tax expense","(1,500,000)","(1,200,000)"),L("Profit for the year","3,500,000","3,000,000"),L("Basic earnings per share","7.00","6.00")]),
 ("Statement of Financial Position",[("Group",()),("Rs. '000",()),L("Property, plant and equipment","1,000,000","950,000"),L("Financial investments","52,000,000","47,500,000"),
   L("Reinsurance contract assets","2,000,000","1,800,000"),L("Cash and cash equivalents","1,500,000","1,200,000"),L("Other assets","3,500,000","3,550,000"),
   L("Total assets","60,000,000","55,000,000"),L("Insurance contract liabilities","38,000,000","35,000,000"),L("Other liabilities","7,000,000","6,500,000"),
   L("Total liabilities","45,000,000","41,500,000"),L("Stated capital","3,000,000","3,000,000"),L("Retained earnings","12,000,000","10,500,000"),
   L("Total equity","15,000,000","13,500,000"),L("Total equity and liabilities","60,000,000","55,000,000")]),
 ("Notes to the Financial Statements",[("1. Corporate information",())])]
pages={"industrial":INDUSTRIAL,"bank":BANK,"insurer":INSURER}[sys.argv[2] if len(sys.argv)>2 else "industrial"]
def esc(s):return s.replace("\\","\\\\").replace("(","\(").replace(")","\)")
objs=[];add=lambda o:(objs.append(o),len(objs))[1]
cat=add(None);pagesobj=add(None);font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
kids=[]
for title,rows in pages:
  ops=["BT /F1 14 Tf 50 800 Td (%s) Tj ET"%esc(title)];y=770
  for label,vals in rows:
    ops.append("BT /F1 10 Tf 50 %d Td (%s) Tj ET"%(y,esc(label)))
    for i,v in enumerate(vals):
      x=430+i*90-len(v)*5.6   # right-aligned columns
      ops.append("BT /F1 10 Tf %.1f %d Td (%s) Tj ET"%(x,y,esc(v)))
    y-=18
  data="\n".join(ops).encode("latin-1")
  cs=add(b"<< /Length %d >>\nstream\n"%len(data)+data+b"\nendstream")
  kids.append(add("<< /Type /Page /Parent %d 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 %d 0 R >> >> /Contents %d 0 R >>"%(pagesobj,font,cs)))
objs[cat-1]="<< /Type /Catalog /Pages %d 0 R >>"%pagesobj
objs[pagesobj-1]="<< /Type /Pages /Kids [%s] /Count %d >>"%(" ".join("%d 0 R"%k for k in kids),len(kids))
out=bytearray(b"%PDF-1.4\n");offs=[]
for i,o in enumerate(objs,1):
  offs.append(len(out));body=o if isinstance(o,bytes) else o.encode("latin-1")
  out+=b"%d 0 obj\n"%i+body+b"\nendobj\n"
x=len(out);out+=b"xref\n0 %d\n0000000000 65535 f \n"%(len(objs)+1)
for o in offs:out+=b"%010d 00000 n \n"%o
out+=b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n"%(len(objs)+1,cat,x)
open(sys.argv[1],"wb").write(out)

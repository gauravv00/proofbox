/**
 * ProofBox - Preloaded Datasets & Dispute Configurations
 * Built for "Build your evidence before you need it"
 */

const DEFAULT_CASES = [
  {
    id: "case-new",
    title: "My Evidence Timeline (New Dispute)",
    disputeType: "General Dispute / Consumer / Tenant",
    opposingParty: "Opposing Party Name",
    claimAmount: "₹0.00",
    status: "Fresh Case - Ready for Evidence",
    batesPrefix: "PB-DOC-",
    createdDate: new Date().toISOString(),
    jurisdiction: "Mediation / Consumer Forum / Civil Court",
    description: "Start adding your photos, WhatsApp chats, bills, and phone call notes. ProofBox will automatically build a court-ready evidence package.",
    notes: "No exhibits added yet. Follow the 3-step guide below to add your first piece of proof.",
    claims: [],
    exhibits: []
  },
  {
    id: "case-001",
    title: "Landlord Security Deposit Dispute - Apt 4B",
    disputeType: "Tenant / Landlord Deposit",
    opposingParty: "Vikas Malhotra (Property Owner) & Horizon Realty",
    claimAmount: "₹1,20,000 (~$1,450)",
    status: "Active Preparation",
    batesPrefix: "PB-APT4B-",
    createdDate: "2026-01-15T09:30:00Z",
    jurisdiction: "Rent Mediation Forum / Civil Court",
    description: "Landlord refused to return security deposit of ₹1,20,000 citing pre-existing ceiling water seepage damage and unauthorized repairs, despite multiple written notifications sent between Oct 2025 and Jan 2026.",
    notes: "Evidence establishes landlord was informed within 48h of leak, promised repairs via WhatsApp, delayed action, tenant mitigated damage, and returned apartment in broom-clean condition.",
    claims: [
      {
        id: "cl-101",
        title: "Refund of Security Deposit (Full Principal)",
        category: "Principal Deposit",
        amount: 120000,
        date: "2026-01-22",
        linkedExhibitId: "ex-102",
        notes: "Held unlawfully beyond 7-day contractual deadline without legitimate damage proof."
      },
      {
        id: "cl-102",
        title: "Emergency Waterproofing Plumber Mitigation Cost",
        category: "Out-of-Pocket Mitigation",
        amount: 8500,
        date: "2025-11-02",
        linkedExhibitId: "ex-105",
        notes: "Authorized verbally on Oct 28 phone call and confirmed via WhatsApp."
      },
      {
        id: "cl-103",
        title: "Disputed Ceiling Plaster Contractor Forfeiture Claim",
        category: "Disputed Deduction",
        amount: -140000,
        date: "2026-01-22",
        linkedExhibitId: "ex-109",
        isDeduction: true,
        notes: "Opposing party's unjustified counter-claim for pre-existing monsoon water seepage."
      }
    ],
    exhibits: [
      {
        id: "ex-101",
        batesNumber: "PB-APT4B-0001",
        title: "Executed Residential Tenancy Agreement (Clause 9: Deposit Refund)",
        category: "Agreement",
        timestamp: "2025-02-01T11:00:00Z",
        sourceType: "PDF Document",
        fileName: "Residential_Lease_Agreement_Apt4B_Executed.pdf",
        fileSize: "2.4 MB",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        sender: "Horizon Properties / Vikas Malhotra",
        recipient: "Aisha Khan (Tenant)",
        summary: "Original 11-month lease establishing ₹1,20,000 security deposit refundable within 7 business days of vacancy minus verified intentional damage.",
        relevance: "Proves legal tenancy, deposit amount paid, and contract obligation to return deposit within 7 days of handover.",
        exif: {
          device: "Adobe Acrobat DC / Scanned via Canon imageRUNNER 2520",
          created: "2025-02-01 11:00:15 IST",
          location: "Bandra West, Mumbai (Registered Sub-Registrar)",
          pageCount: 14
        },
        verified: true,
        previewType: "pdf",
        previewText: "LEASE AGREEMENT - CLAUSE 9: 'The Lessor covenants to refund the interest-free security deposit of INR 1,20,000/- within seven (7) days of vacant possession subject only to verified structural damages caused willfully by Lessee.'"
      },
      {
        id: "ex-102",
        batesNumber: "PB-APT4B-0002",
        title: "Initial Security Deposit Bank Transfer Receipt",
        category: "Payment",
        timestamp: "2025-02-02T14:22:10Z",
        sourceType: "Bank Statement / UPI Receipt",
        fileName: "HDFC_Txn_Ref_40332891_DepositPaid.pdf",
        fileSize: "412 KB",
        sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
        sender: "Aisha Khan (HDFC A/c ****4102)",
        recipient: "Vikas Malhotra (ICICI A/c ****9912)",
        summary: "IMPS transaction confirmation showing ₹1,20,000 transfer specifically marked 'Apt 4B Security Deposit'.",
        relevance: "Irrefutable financial paper trail verifying full payment received by landlord prior to move-in.",
        exif: {
          device: "HDFC NetBanking Server Export",
          created: "2025-02-02 14:22:10 IST",
          location: "Server Timestamp",
          txnId: "IMPS/503314092811/DEP-APT4B"
        },
        verified: true,
        previewType: "payment",
        amount: "₹1,20,000.00"
      },
      {
        id: "ex-103",
        batesNumber: "PB-APT4B-0003",
        title: "Master Bedroom Ceiling Seepage & Water Ingress Photos",
        category: "Damage Photo",
        timestamp: "2025-10-12T08:14:32Z",
        sourceType: "JPEG Photo (EXIF Verified)",
        fileName: "IMG_20251012_081432_CeilingSeep.jpg",
        fileSize: "4.8 MB",
        sha256: "a1c583961dd3c1ac88b59b2dc327aa48f434346648f6b96df89dda901c5176b1",
        sender: "Aisha Khan",
        recipient: "Evidence Record",
        summary: "High-resolution photos showing bubbling drywall, water stains, and dripping ceiling directly over wardrobe area.",
        relevance: "Establishes structural seepage began in October 2025 during monsoon and originated from upper flat, not tenant negligence.",
        exif: {
          device: "Apple iPhone 15 Pro (Back Triple Camera 24mm f/1.78)",
          created: "2025-10-12 08:14:32 IST",
          location: "19.0596° N, 72.8295° E (Pali Hill, Mumbai - Apt 4B)",
          iso: 250,
          resolution: "4032 x 3024 (12.2 MP)"
        },
        verified: true,
        previewType: "image",
        imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "ex-104",
        batesNumber: "PB-APT4B-0004",
        title: "WhatsApp Notification to Landlord with Photo Attachments",
        category: "Communication",
        timestamp: "2025-10-12T08:25:00Z",
        sourceType: "Chat Export & Screenshot",
        fileName: "WhatsApp_Chat_Malhotra_20251012.pdf",
        fileSize: "1.1 MB",
        sha256: "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d",
        sender: "Aisha Khan (+91 98201 XXXXX)",
        recipient: "Vikas Malhotra Landlord (+91 98199 XXXXX)",
        summary: "Sent photos of ceiling leak to landlord with explicit warning: 'Hi Vikas, huge water leak started dripping from ceiling above wardrobe. Needs urgent waterproofing plumber.' Landlord replied: 'Noted, I will send building contractor on Monday.'",
        relevance: "Proves immediate 11-minute notification to landlord and landlord's admission of receipt and duty of repair.",
        exif: {
          device: "WhatsApp iOS Export + Screen Capture",
          created: "2025-10-12 08:25:00 IST",
          location: "Cellular Network Log Verified",
          readReceipt: "Double Blue Ticks at 08:26:14 IST"
        },
        verified: true,
        previewType: "chat",
        chatSnippet: "[12/10/2025, 08:25:12] Aisha: Hi Vikas, urgent - ceiling in master bedroom is bubbling and dripping water onto the wardrobe! Please send someone.\n[12/10/2025, 08:31:04] Vikas Malhotra: Noted Aisha. Upper floor 5B had terrace washing. Don't worry I will send building contractor on Monday to patch it."
      },
      {
        id: "ex-105",
        batesNumber: "PB-APT4B-0005",
        title: "Contemporaneous Note: Verbal Phone Call with Landlord",
        category: "Verbal Note",
        timestamp: "2025-10-28T18:40:00Z",
        sourceType: "Recorded Incident Note",
        fileName: "Contemporaneous_Note_Call_20251028.txt",
        fileSize: "28 KB",
        sha256: "72f10b89b4f23b28bca87b0034a7e447b9500058b8f2d59392ab8cfbf3e390c5",
        sender: "Aisha Khan (Call with Vikas Malhotra)",
        recipient: "Personal Contemporaneous Record",
        summary: "Follow-up phone call (duration 6m 42s). Landlord claimed contractor was busy for Diwali, authorized Aisha to hire an emergency plumber to seal pipe crack, promising to deduct cost from rent or reimburse.",
        relevance: "Establishes landlord gave explicit oral approval for emergency mitigation repairs to prevent secondary structural damage.",
        exif: {
          device: "Recorded in ProofBox Mobile App (Draft Note)",
          created: "2025-10-28 18:48:10 IST",
          location: "19.0596° N, 72.8295° E",
          callDuration: "00:06:42 recorded on Airtel network"
        },
        verified: true,
        previewType: "note"
      },
      {
        id: "ex-106",
        batesNumber: "PB-APT4B-0006",
        title: "Emergency Waterproofing Plumber Invoice & UPI Proof",
        category: "Payment",
        timestamp: "2025-11-02T16:15:00Z",
        sourceType: "Tax Invoice + UPI Receipt",
        fileName: "Shree_Ganesh_Plumbing_Invoice_481.pdf",
        fileSize: "890 KB",
        sha256: "b45cffe084dd3d20d928bee85e7b0f21415e34749fb2a450125f4ab36a441364",
        sender: "Aisha Khan",
        recipient: "Shree Ganesh Plumbing & Waterproofing Works",
        summary: "Emergency repair bill of ₹8,500 for ceiling scraping, sealant application, and pipe joint seal, with GST bill #481 and UPI ref #5307129841.",
        relevance: "Documentary proof of tenant mitigating damage out-of-pocket following landlord's verbal authorization.",
        exif: {
          device: "Merchant Invoice Scanner (CamScanner)",
          created: "2025-11-02 16:15:30 IST",
          location: "19.0596° N, 72.8295° E",
          gstNumber: "27AAAAA0000A1Z5"
        },
        verified: true,
        previewType: "payment",
        amount: "₹8,500.00"
      },
      {
        id: "ex-107",
        batesNumber: "PB-APT4B-0007",
        title: "Formal Notice to Vacate & Key Handover Inspection Request",
        category: "Notice",
        timestamp: "2025-12-15T10:00:00Z",
        sourceType: "Registered Email (.eml / PDF)",
        fileName: "Formal_Notice_Vacate_Apt4B_Dec2025.pdf",
        fileSize: "620 KB",
        sha256: "c56b7722253457a829f0f9b6b7cb34a7e447b9500058b8f2d59392ab8cfbf3e3",
        sender: "aisha.khan@lawconnect.in",
        recipient: "vikas.malhotra@horizongroup.in",
        summary: "Formal 30-day notice to terminate lease as of Jan 15, 2026. Requested joint move-out inspection on Jan 14 and specified bank account details for ₹1,20,000 security deposit return.",
        relevance: "Full compliance with contract notice provisions and formal request for walkthrough inspection prior to handover.",
        exif: {
          device: "Google Workspace Mail Server (DKIM & SPF Verified)",
          created: "2025-12-15 10:00:22 UTC",
          location: "Mail Headers Cryptographically Signed",
          smtpMessageId: "<CAH9s8K_991823@mail.gmail.com>"
        },
        verified: true,
        previewType: "email",
        emailSubject: "Notice of Non-Renewal & Key Handover Schedule - Apartment 4B"
      },
      {
        id: "ex-108",
        batesNumber: "PB-APT4B-0008",
        title: "Handover Day Move-Out Walkthrough Video & Key Surrender",
        category: "Damage Photo",
        timestamp: "2026-01-14T17:30:00Z",
        sourceType: "Video Keyframes & Inspection Checklist",
        fileName: "MoveOut_Walkthrough_Proof_20260114.mp4",
        fileSize: "32.4 MB",
        sha256: "f2c3b889b4f23b28bca87b0034a7e447b9500058b8f2d59392ab8cfbf3e390c5",
        sender: "Aisha Khan & Building Caretaker Ramesh",
        recipient: "Handover Audit Record",
        summary: "Full 360-degree video inspection showing pristine apartment condition, cleaned tiles, functioning appliances, and keys left with caretaker Ramesh with signed receipt.",
        relevance: "Directly refutes landlord's later claim that apartment was left damaged or dirty.",
        exif: {
          device: "Apple iPhone 15 Pro (4K 60fps)",
          created: "2026-01-14 17:30:12 IST",
          location: "19.0596° N, 72.8295° E (Apt 4B Living Room)",
          duration: "04:18"
        },
        verified: true,
        previewType: "image",
        imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "ex-109",
        batesNumber: "PB-APT4B-0009",
        title: "Landlord WhatsApp Message Refusing Deposit Return",
        category: "Communication",
        timestamp: "2026-01-22T19:15:00Z",
        sourceType: "Chat Export & Screenshot",
        fileName: "WhatsApp_Deposit_Refusal_20260122.png",
        fileSize: "780 KB",
        sha256: "91b7852b855e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca4959",
        sender: "Vikas Malhotra Landlord (+91 98199 XXXXX)",
        recipient: "Aisha Khan (+91 98201 XXXXX)",
        summary: "Landlord wrote: 'I inspected flat today. Whole ceiling needs replastering and you did illegal repairs without permission. Total estimate is ₹1,40,000 so entire deposit is forfeited.'",
        relevance: "Direct trigger for legal action. Proves landlord is penalizing tenant for the pre-existing water seepage reported 3 months prior.",
        exif: {
          device: "iOS Screenshot",
          created: "2026-01-22 19:15:44 IST",
          location: "Network logged",
          readReceipt: "Delivered & Read"
        },
        verified: true,
        previewType: "chat",
        chatSnippet: "[22/01/2026, 19:15:02] Vikas Malhotra: Hi Aisha, I inspected flat today with painting guy. Whole bedroom ceiling needs replastering and you did unauthorized repairs with cheap plaster without my formal written permission. Contractor quote is ₹1,40,000. So your deposit is zero. You actually owe me ₹20,000.\n[22/01/2026, 19:18:22] Aisha: Vikas, you specifically told me on the phone on 28 Oct to hire the emergency plumber! And I reported the leak back on 12 Oct. I have all the records."
      }
    ]
  },
  {
    id: "case-002",
    title: "Freelance Unpaid Invoice - Apex Tech Labs",
    disputeType: "Contractor / Payment Default",
    opposingParty: "Apex Tech Labs Pvt. Ltd. & COO Rajesh Nair",
    claimAmount: "₹2,45,000 (~$2,950)",
    status: "Pre-Legal Demand Notice",
    batesPrefix: "PB-APEX-",
    createdDate: "2026-02-01T14:00:00Z",
    jurisdiction: "Commercial Court / MSME Samadhaan",
    description: "Full-stack mobile app redesign completed, delivered, and approved on staging server in November 2025. Final invoice #INV-1088 has remained unpaid beyond the 30-day term despite repeated written reminders.",
    notes: "Milestone 3 code merged to client GitHub repo on Nov 20, 2025; email sign-off received Nov 22; invoice overdue since Dec 22.",
    claims: [
      {
        id: "cl-201",
        title: "Milestone 3 Full-Stack Application Final Tax Invoice #INV-1088",
        category: "Unpaid Invoice",
        amount: 245000,
        date: "2025-11-22",
        linkedExhibitId: "ex-203",
        notes: "QA approved and deployed to production; overdue since Dec 22 under MSMED Act."
      }
    ],
    exhibits: [
      {
        id: "ex-201",
        batesNumber: "PB-APEX-0001",
        title: "Master Services Agreement (MSA) & Scope of Work",
        category: "Agreement",
        timestamp: "2025-08-10T10:00:00Z",
        sourceType: "DocuSign Verified PDF",
        fileName: "MSA_ApexTech_AishaKhan_Executed.pdf",
        fileSize: "1.8 MB",
        sha256: "7b0034a7e447b9500058b8f2d59392ab8cfbf3e390c572f10b89b4f23b28bca8",
        sender: "Apex Tech Labs",
        recipient: "Aisha Khan",
        summary: "Contract outlining ₹5,00,000 total fee across 3 milestones; Net 30 payment terms.",
        relevance: "Valid binding commercial contract with clear delivery specifications and payment deadlines.",
        exif: {
          device: "DocuSign Envelope ID: 88A9-923B-98F1",
          created: "2025-08-10 10:00:00 UTC",
          location: "Electronic Signature Audit Trail Certified"
        },
        verified: true,
        previewType: "pdf"
      },
      {
        id: "ex-202",
        batesNumber: "PB-APEX-0002",
        title: "Milestone 3 Completion & Client Acceptance Email",
        category: "Notice",
        timestamp: "2025-11-22T15:42:00Z",
        sourceType: "Email (.eml)",
        fileName: "ApexTech_SignOff_Milestone3.eml",
        fileSize: "340 KB",
        sha256: "88b59b2dc327aa48f434346648f6b96df89dda901c5176b1a1c583961dd3c1ac",
        sender: "rajesh.nair@apextechlabs.io",
        recipient: "aisha.khan@lawconnect.in",
        summary: "Written sign-off stating: 'The build looks solid, staging QA passed. Please raise the final milestone invoice.'",
        relevance: "Conclusive proof of client satisfaction, formal acceptance of work, and greenlight to invoice.",
        exif: {
          device: "Google Workspace DKIM Verified",
          created: "2025-11-22 15:42:18 UTC",
          location: "SMTP relay"
        },
        verified: true,
        previewType: "email",
        emailSubject: "Milestone 3 Approval & Invoice Request - Android & iOS Release"
      },
      {
        id: "ex-203",
        batesNumber: "PB-APEX-0003",
        title: "Final Tax Invoice #INV-1088 (Due Dec 22, 2025)",
        category: "Payment",
        timestamp: "2025-11-22T17:00:00Z",
        sourceType: "PDF Invoice",
        fileName: "Invoice_INV1088_ApexTech.pdf",
        fileSize: "450 KB",
        sha256: "48f6b96df89dda901c5176b1a1c583961dd3c1ac88b59b2dc327aa48f4343466",
        sender: "Aisha Khan",
        recipient: "Apex Tech Labs Pvt. Ltd.",
        summary: "Final invoice for ₹2,45,000 (Milestone 3 + 18% GST).",
        relevance: "Quantifies exact legal debt outstanding under Section 15 of MSMED Act.",
        exif: {
          device: "Zoho Books Export",
          created: "2025-11-22 17:00:00 IST",
          location: "IRN Generated"
        },
        verified: true,
        previewType: "payment",
        amount: "₹2,45,000.00"
      }
    ]
  },
  {
    id: "case-003",
    title: "Consumer Defective Appliance Warranty Dispute",
    disputeType: "Consumer Protection / Warranty",
    opposingParty: "VoltMax Electronics & Authorized Service Center",
    claimAmount: "₹48,990",
    status: "Drafting Notice",
    batesPrefix: "PB-VOLT-",
    createdDate: "2026-01-20T11:00:00Z",
    jurisdiction: "District Consumer Disputes Redressal Commission",
    description: "High-end inverter AC compressor died within 4 months of purchase under 5-year warranty. Service center falsely claimed 'external physical tampering' to void warranty repair.",
    notes: "Service center technician report contradicts original installation checklist.",
    claims: [
      {
        id: "cl-301",
        title: "Refund of Purchase Price for Defective Inverter AC #VM-99120-X",
        category: "Defective Product Refund",
        amount: 48990,
        date: "2025-08-05",
        linkedExhibitId: "ex-301",
        notes: "Compressor failure within 4 months during 5-year warranty period; service center refused replacement."
      }
    ],
    exhibits: [
      {
        id: "ex-301",
        batesNumber: "PB-VOLT-0001",
        title: "Original Retail Purchase Bill & 5-Year Comprehensive Warranty Card",
        category: "Agreement",
        timestamp: "2025-08-05T12:30:00Z",
        sourceType: "Tax Invoice PDF",
        fileName: "VoltMax_Retail_Invoice_Croma.pdf",
        fileSize: "920 KB",
        sha256: "df89dda901c5176b1a1c583961dd3c1ac88b59b2dc327aa48f434346648f6b96",
        sender: "Infiniti Retail (Croma)",
        recipient: "Aisha Khan",
        summary: "Tax invoice of ₹48,990 showing serial number #VM-99120-X and 5-year warranty on PCB and compressor.",
        relevance: "Establishes consumer status, purchase date, and active warranty protection.",
        exif: {
          device: "POS Terminal Generated",
          created: "2025-08-05 12:30:00 IST",
          location: "Mumbai Store #12"
        },
        verified: true,
        previewType: "payment",
        amount: "₹48,990.00"
      }
    ]
  }
];

const SAMPLE_WHATSAPP_TRANSCRIPT = `[12/10/2025, 08:25:12] Aisha Khan: Hi Vikas, urgent - ceiling in master bedroom is bubbling and dripping water onto the wardrobe! Please send someone.
[12/10/2025, 08:31:04] Vikas Malhotra: Noted Aisha. Upper floor 5B had terrace washing. Don't worry I will send building contractor on Monday to patch it.
[15/10/2025, 11:14:20] Aisha Khan: Hi Vikas, contractor didn't come. Plaster is peeling and falling on the floor now. Water is still damp.
[15/10/2025, 14:02:10] Vikas Malhotra: He was tied up at another site. He will come Thursday morning 100%.
[28/10/2025, 17:30:15] Aisha Khan: Vikas, the crack opened up more after yesterday's rain. The water is ruining the wardrobe wood. Can I get a local plumber right now?
[28/10/2025, 18:32:00] Vikas Malhotra: Yes please call local guy to seal crack immediately. Keep the bill, we will settle it in next month rent.
[02/11/2025, 18:10:05] Aisha Khan: Plumber Ganesh completed waterproofing patch. Paid ₹8,500 via UPI. Sharing bill receipt here.
[02/11/2025, 19:00:22] Vikas Malhotra: Ok received. Thanks for handling.
[22/01/2026, 19:15:02] Vikas Malhotra: Hi Aisha, I inspected flat today with painting guy. Whole bedroom ceiling needs replastering and you did unauthorized repairs with cheap plaster without my formal written permission. Contractor quote is ₹1,40,000. So your deposit is zero. You actually owe me ₹20,000.
[22/01/2026, 19:18:22] Aisha Khan: Vikas, you specifically told me on the phone and WhatsApp on 28 Oct to hire the emergency plumber! And I reported the leak back on 12 Oct. I have all the records.`;

const CATEGORY_COLORS = {
  "Communication": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-600" },
  "Payment": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-600" },
  "Damage Photo": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-600" },
  "Agreement": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-600" },
  "Notice": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-600" },
  "Verbal Note": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-600" }
};

const SAMPLE_VERBAL_NOTE = {
  title: "Phone Call with Landlord Vikas Malhotra Regarding Emergency Plumber Approval",
  timestamp: "2025-10-28T18:25:00",
  speaker: "Vikas Malhotra (Landlord)",
  duration: "4 mins 12 secs",
  summary: "Called Vikas to report that ceiling crack opened further after heavy rain and water was threatening the wooden wardrobe. Vikas explicitly authorized me on the call to hire a local plumber immediately and stated: 'Keep the bill, we will settle it in next month rent.'",
  relevance: "Establishes landlord gave express verbal authorization for emergency repairs, defeating his later defense of unauthorized repair."
};

const DISPUTE_CHECKLISTS = {
  "Tenant / Landlord Deposit": [
    { id: "chk-1", title: "Executed Tenancy / Lease Agreement", requiredCategory: "Agreement", description: "Proves legal tenancy, deposit amount, and return terms." },
    { id: "chk-2", title: "Bank / UPI Payment Proof of Deposit", requiredCategory: "Payment", description: "Irrefutable proof the landlord actually received the deposit funds." },
    { id: "chk-3", title: "Move-in / Move-out Photos or Video", requiredCategory: "Damage Photo", description: "Contemporaneous visual proof of property condition." },
    { id: "chk-4", title: "Written Maintenance / Defect Notifications", requiredCategory: "Communication", description: "Establishes landlord had notice and delayed repair." },
    { id: "chk-5", title: "Formal Vacancy / Handover Notice", requiredCategory: "Notice", description: "Proves compliance with contract notice period and key return." }
  ],
  "Contractor / Payment Default": [
    { id: "chk-1", title: "Master Services Agreement (MSA) or Written Scope", requiredCategory: "Agreement", description: "Binding contract with payment milestones and deliverables." },
    { id: "chk-2", title: "Milestone Delivery & Client Acceptance Sign-off", requiredCategory: "Notice", description: "Proves deliverables were accepted without protest." },
    { id: "chk-3", title: "Tax Invoice with Payment Due Date", requiredCategory: "Payment", description: "Itemized formal invoice establishing legal debt due." },
    { id: "chk-4", title: "Written Payment Reminders & Default Notices", requiredCategory: "Communication", description: "Evidence of persistent follow-ups and client delay." }
  ],
  "Consumer Protection / Warranty": [
    { id: "chk-1", title: "Original Retail Invoice & Proof of Purchase", requiredCategory: "Agreement", description: "Establishes consumer status, purchase date, and product serial number." },
    { id: "chk-2", title: "Warranty Card / Terms Document", requiredCategory: "Agreement", description: "Confirms product was within active manufacturer warranty period." },
    { id: "chk-3", title: "Service Center Job Sheet / Technician Report", requiredCategory: "Damage Photo", description: "Official documentation of defect and refusal or delay reason." },
    { id: "chk-4", title: "Written Complaint / Grievance Escalation", requiredCategory: "Communication", description: "Demonstrates attempts to resolve before legal notice." }
  ],
  "General": [
    { id: "chk-1", title: "Core Agreement, Bill, or Work Order", requiredCategory: "Agreement", description: "Underlying commercial or personal commitment between parties." },
    { id: "chk-2", title: "Financial Transactions / Payment Receipts", requiredCategory: "Payment", description: "Documented financial trail showing money paid or owed." },
    { id: "chk-3", title: "Contemporaneous Written Communications", requiredCategory: "Communication", description: "WhatsApp chats, emails, or text messages documenting the dispute." },
    { id: "chk-4", title: "Photographs, Physical Evidence, or Reports", requiredCategory: "Damage Photo", description: "Visual or third-party documentation of damages or defects." },
    { id: "chk-5", title: "Formal Demand or Notice of Dispute", requiredCategory: "Notice", description: "Clear notification giving opposing party opportunity to cure." }
  ]
};

window.PROOFBOX_DATA = {
  DEFAULT_CASES,
  SAMPLE_WHATSAPP_TRANSCRIPT,
  SAMPLE_VERBAL_NOTE,
  DISPUTE_CHECKLISTS,
  CATEGORY_COLORS
};


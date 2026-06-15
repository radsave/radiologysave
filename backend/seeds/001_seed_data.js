const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── CATALOG DATA ─────────────────────────────────────────────────────────────
const CATALOG = [
  { modality: 'MRI', color: '#D6E4F0', sort: 1, bodies: [
    { name: 'Brain', protocols: [
      { name: 'Brain w/o Contrast', contrast: false },
      { name: 'Brain w/ Contrast', contrast: true },
      { name: 'Brain w/ & w/o Contrast', contrast: true },
      { name: 'Brain w/ Spectroscopy', contrast: true },
    ]},
    { name: 'Spine', protocols: [
      { name: 'Cervical Spine w/o Contrast', contrast: false },
      { name: 'Cervical Spine w/ Contrast', contrast: true },
      { name: 'Cervical Spine w/ & w/o Contrast', contrast: true },
      { name: 'Thoracic Spine w/o Contrast', contrast: false },
      { name: 'Thoracic Spine w/ Contrast', contrast: true },
      { name: 'Lumbar Spine w/o Contrast', contrast: false },
      { name: 'Lumbar Spine w/ Contrast', contrast: true },
      { name: 'Lumbar Spine w/ & w/o Contrast', contrast: true },
    ]},
    { name: 'Shoulder', protocols: [
      { name: 'Shoulder w/o Contrast', contrast: false },
      { name: 'Shoulder w/ Contrast', contrast: true },
      { name: 'Shoulder w/ & w/o Contrast', contrast: true },
    ]},
    { name: 'Knee', protocols: [
      { name: 'Knee w/o Contrast', contrast: false },
      { name: 'Knee w/ Contrast', contrast: true },
    ]},
    { name: 'Hip', protocols: [
      { name: 'Hip w/o Contrast', contrast: false },
      { name: 'Hip w/ Contrast', contrast: true },
      { name: 'Hip Bilateral w/o Contrast', contrast: false },
    ]},
    { name: 'Wrist', protocols: [{ name: 'Wrist w/o Contrast', contrast: false }, { name: 'Wrist w/ Contrast', contrast: true }]},
    { name: 'Ankle', protocols: [{ name: 'Ankle w/o Contrast', contrast: false }, { name: 'Ankle w/ Contrast', contrast: true }]},
    { name: 'Elbow', protocols: [{ name: 'Elbow w/o Contrast', contrast: false }]},
    { name: 'Foot',  protocols: [{ name: 'Foot w/o Contrast', contrast: false }]},
    { name: 'Abdomen', protocols: [
      { name: 'Abdomen w/o Contrast', contrast: false },
      { name: 'Abdomen w/ Contrast', contrast: true },
      { name: 'Abdomen w/ & w/o Contrast', contrast: true },
    ]},
    { name: 'Pelvis', protocols: [
      { name: 'Pelvis w/o Contrast', contrast: false },
      { name: 'Pelvis w/ Contrast', contrast: true },
      { name: 'Pelvis w/ & w/o Contrast', contrast: true },
    ]},
    { name: 'Abdomen/Pelvis', protocols: [
      { name: 'Abdomen & Pelvis w/o Contrast', contrast: false },
      { name: 'Abdomen & Pelvis w/ & w/o Contrast', contrast: true },
    ]},
    { name: 'Chest', protocols: [{ name: 'Chest w/o Contrast', contrast: false }, { name: 'Chest w/ Contrast', contrast: true }]},
    { name: 'Orbit/Face/Neck', protocols: [
      { name: 'Orbit w/o Contrast', contrast: false },
      { name: 'Face w/o Contrast', contrast: false },
      { name: 'Neck (Soft Tissue) w/o Contrast', contrast: false },
    ]},
    { name: 'Breast', protocols: [{ name: 'Breast Bilateral w/ & w/o Contrast', contrast: true }]},
  ]},
  { modality: 'CT', color: '#D5F5E3', sort: 2, bodies: [
    { name: 'Head/Brain', protocols: [
      { name: 'Head w/o Contrast', contrast: false },
      { name: 'Head w/ Contrast', contrast: true },
      { name: 'Head w/ & w/o Contrast', contrast: true },
      { name: 'Brain Perfusion', contrast: true },
    ]},
    { name: 'Sinus', protocols: [{ name: 'Sinus w/o Contrast', contrast: false }]},
    { name: 'Neck', protocols: [{ name: 'Neck (Soft Tissue) w/o Contrast', contrast: false }, { name: 'Neck (Soft Tissue) w/ Contrast', contrast: true }]},
    { name: 'Chest', protocols: [
      { name: 'Chest w/o Contrast', contrast: false },
      { name: 'Chest w/ Contrast', contrast: true },
      { name: 'Chest w/ & w/o Contrast', contrast: true },
      { name: 'Chest High Resolution (HRCT)', contrast: false },
      { name: 'CT Angiography Pulmonary (PE)', contrast: true },
    ]},
    { name: 'Abdomen', protocols: [
      { name: 'Abdomen w/o Contrast', contrast: false },
      { name: 'Abdomen w/ Contrast', contrast: true },
      { name: 'Abdomen w/ & w/o Contrast', contrast: true },
    ]},
    { name: 'Pelvis', protocols: [{ name: 'Pelvis w/o Contrast', contrast: false }, { name: 'Pelvis w/ Contrast', contrast: true }]},
    { name: 'Abdomen/Pelvis', protocols: [
      { name: 'Abdomen & Pelvis w/o Contrast', contrast: false },
      { name: 'Abdomen & Pelvis w/ Contrast', contrast: true },
      { name: 'Abdomen & Pelvis w/ & w/o Contrast', contrast: true },
    ]},
    { name: 'Spine', protocols: [
      { name: 'Cervical Spine w/o Contrast', contrast: false },
      { name: 'Thoracic Spine w/o Contrast', contrast: false },
      { name: 'Lumbar Spine w/o Contrast', contrast: false },
    ]},
    { name: 'Extremity', protocols: [{ name: 'Upper Extremity w/o Contrast', contrast: false }, { name: 'Lower Extremity w/o Contrast', contrast: false }]},
    { name: 'Cardiac', protocols: [{ name: 'Coronary Artery Calcium Score', contrast: false }, { name: 'CT Coronary Angiography', contrast: true }]},
  ]},
  { modality: 'Ultrasound', color: '#FEF9E7', sort: 3, bodies: [
    { name: 'Abdomen', protocols: [{ name: 'Abdomen Complete', contrast: false }, { name: 'Abdomen Limited', contrast: false }]},
    { name: 'Pelvis', protocols: [
      { name: 'Pelvis Complete (Transabdominal)', contrast: false },
      { name: 'Pelvis Transvaginal', contrast: false },
      { name: 'Pelvis Complete (Trans & Transvaginal)', contrast: false },
    ]},
    { name: 'OB', protocols: [{ name: 'OB 1st Trimester', contrast: false }, { name: 'OB 2nd/3rd Trimester', contrast: false }]},
    { name: 'Renal', protocols: [{ name: 'Renal Complete', contrast: false }, { name: 'Renal w/ Bladder', contrast: false }]},
    { name: 'Thyroid', protocols: [{ name: 'Thyroid w/ Parathyroid', contrast: false }]},
    { name: 'Breast', protocols: [{ name: 'Breast Unilateral', contrast: false }, { name: 'Breast Bilateral', contrast: false }]},
    { name: 'Scrotum', protocols: [{ name: 'Scrotum (Testicular)', contrast: false }]},
    { name: 'Soft Tissue', protocols: [{ name: 'Soft Tissue (Limited)', contrast: false }]},
    { name: 'Vascular', protocols: [
      { name: 'Carotid Duplex Bilateral', contrast: false },
      { name: 'Lower Extremity Venous Duplex Bilateral', contrast: false },
      { name: 'Lower Extremity Arterial Duplex Bilateral', contrast: false },
      { name: 'Aorta', contrast: false },
    ]},
  ]},
  { modality: 'X-Ray', color: '#FDEDEC', sort: 4, bodies: [
    { name: 'Chest', protocols: [{ name: 'Chest 2 Views', contrast: false }, { name: 'Chest AP Portable', contrast: false }]},
    { name: 'Abdomen', protocols: [{ name: 'Abdomen 1 View (KUB)', contrast: false }, { name: 'Abdomen 2 Views', contrast: false }]},
    { name: 'Spine', protocols: [
      { name: 'Cervical Spine 2 Views', contrast: false }, { name: 'Cervical Spine 4+ Views', contrast: false },
      { name: 'Lumbar Spine 2 Views', contrast: false }, { name: 'Lumbar Spine 4+ Views', contrast: false },
      { name: 'Thoracic Spine 2 Views', contrast: false },
    ]},
    { name: 'Shoulder', protocols: [{ name: 'Shoulder 2 Views', contrast: false }]},
    { name: 'Elbow', protocols: [{ name: 'Elbow 2 Views', contrast: false }]},
    { name: 'Wrist', protocols: [{ name: 'Wrist 2 Views', contrast: false }]},
    { name: 'Hand', protocols: [{ name: 'Hand 2 Views', contrast: false }]},
    { name: 'Hip', protocols: [{ name: 'Hip 2 Views', contrast: false }]},
    { name: 'Knee', protocols: [{ name: 'Knee 2 Views', contrast: false }]},
    { name: 'Ankle', protocols: [{ name: 'Ankle 2 Views', contrast: false }]},
    { name: 'Foot', protocols: [{ name: 'Foot 2 Views', contrast: false }]},
    { name: 'Pelvis', protocols: [{ name: 'Pelvis 1 View', contrast: false }]},
  ]},
  { modality: 'Mammogram', color: '#F5EEF8', sort: 5, bodies: [
    { name: 'Breast', protocols: [
      { name: 'Screening Mammogram Bilateral', contrast: false },
      { name: 'Diagnostic Mammogram Bilateral', contrast: false },
      { name: 'Diagnostic Mammogram Unilateral', contrast: false },
      { name: '3D Mammogram (Tomosynthesis) Bilateral', contrast: false },
    ]},
  ]},
  { modality: 'PET Scan', color: '#FDF2E9', sort: 6, bodies: [
    { name: 'Whole Body', protocols: [
      { name: 'PET/CT Whole Body FDG', contrast: false },
      { name: 'PET/CT Whole Body FDG w/ IV Contrast', contrast: true },
    ]},
    { name: 'Brain', protocols: [
      { name: 'PET Brain FDG', contrast: false },
      { name: 'PET Brain Amyloid', contrast: false },
    ]},
  ]},
  { modality: 'DEXA', color: '#EAF4FB', sort: 7, bodies: [
    { name: 'Spine/Hip', protocols: [{ name: 'DEXA Bone Density (Axial) - Spine & Hip', contrast: false }]},
    { name: 'Whole Body', protocols: [{ name: 'DEXA Whole Body Composition', contrast: false }]},
    { name: 'Forearm', protocols: [{ name: 'DEXA Forearm (Peripheral)', contrast: false }]},
  ]},
  { modality: 'MRA', color: '#E8F8F5', sort: 8, bodies: [
    { name: 'Brain', protocols: [{ name: 'MRA Brain w/o Contrast', contrast: false }, { name: 'MRA Brain w/ Contrast', contrast: true }]},
    { name: 'Neck', protocols: [{ name: 'MRA Neck (Carotid) w/o Contrast', contrast: false }, { name: 'MRA Neck (Carotid) w/ Contrast', contrast: true }]},
    { name: 'Chest', protocols: [{ name: 'MRA Chest (Aorta) w/ Contrast', contrast: true }]},
    { name: 'Abdomen', protocols: [{ name: 'MRA Abdomen (Renal/Aorta) w/ Contrast', contrast: true }]},
    { name: 'Lower Extremity', protocols: [{ name: 'MRA Lower Extremity Runoff w/ Contrast', contrast: true }]},
  ]},
  { modality: 'CTA', color: '#FEF5E7', sort: 9, bodies: [
    { name: 'Head', protocols: [{ name: 'CTA Head (Circle of Willis)', contrast: true }]},
    { name: 'Neck', protocols: [{ name: 'CTA Neck (Carotid/Vertebral)', contrast: true }]},
    { name: 'Chest', protocols: [{ name: 'CTA Chest (Aorta)', contrast: true }]},
    { name: 'Abdomen', protocols: [{ name: 'CTA Abdomen/Pelvis (Aorta & Iliacs)', contrast: true }]},
    { name: 'Pulmonary', protocols: [{ name: 'CTA Pulmonary (PE Protocol)', contrast: true }]},
    { name: 'Coronary', protocols: [{ name: 'CTA Coronary Angiography', contrast: true }]},
  ]},
  { modality: 'Stress Tests & EKG', color: '#F4ECF7', sort: 10, bodies: [
    { name: 'Cardiac', protocols: [
      { name: 'Standard Treadmill Stress Test', contrast: false },
      { name: 'Nuclear Stress Test (Myocardial Perfusion)', contrast: false },
      { name: 'Stress Echocardiogram', contrast: false },
      { name: 'Resting EKG / 12-Lead ECG', contrast: false },
    ]},
  ]},
  { modality: 'Virtual Colonoscopy', color: '#F0F3F4', sort: 11, bodies: [
    { name: 'Colon/Rectum', protocols: [
      { name: 'CT Colonography (Virtual Colonoscopy) w/o Contrast', contrast: false },
      { name: 'CT Colonography w/ IV Contrast', contrast: true },
    ]},
  ]},
];

// ─── PRICING DATA (protocol name -> price) ───────────────────────────────────
const PRICES = {
  'Brain w/o Contrast': 270.76, 'Brain w/ Contrast': 345.00, 'Brain w/ & w/o Contrast': 399.00, 'Brain w/ Spectroscopy': 399.00,
  'Cervical Spine w/o Contrast': 263.22, 'Cervical Spine w/ Contrast': 340.00, 'Cervical Spine w/ & w/o Contrast': 395.00,
  'Thoracic Spine w/o Contrast': 265.00, 'Thoracic Spine w/ Contrast': 340.00,
  'Lumbar Spine w/o Contrast': 264.10, 'Lumbar Spine w/ Contrast': 340.00, 'Lumbar Spine w/ & w/o Contrast': 395.00,
  'Shoulder w/o Contrast': 265.00, 'Shoulder w/ Contrast': 345.00, 'Shoulder w/ & w/o Contrast': 399.00,
  'Knee w/o Contrast': 279.38, 'Knee w/ Contrast': 350.00,
  'Hip w/o Contrast': 265.00, 'Hip w/ Contrast': 345.00, 'Hip Bilateral w/o Contrast': 310.00,
  'Wrist w/o Contrast': 265.00, 'Wrist w/ Contrast': 345.00,
  'Ankle w/o Contrast': 265.00, 'Ankle w/ Contrast': 345.00,
  'Elbow w/o Contrast': 265.00, 'Foot w/o Contrast': 265.00,
  'Abdomen w/o Contrast': 270.30, 'Abdomen w/ Contrast': 350.00, 'Abdomen w/ & w/o Contrast': 405.00,
  'Pelvis w/o Contrast': 270.00, 'Pelvis w/ Contrast': 350.00, 'Pelvis w/ & w/o Contrast': 405.00,
  'Abdomen & Pelvis w/o Contrast': 370.00, 'Abdomen & Pelvis w/ & w/o Contrast': 499.00,
  'Chest w/o Contrast': 270.00, 'Chest w/ Contrast': 350.00,
  'Orbit w/o Contrast': 270.00, 'Face w/o Contrast': 270.00, 'Neck (Soft Tissue) w/o Contrast': 265.00,
  'Breast Bilateral w/ & w/o Contrast': 499.00,
  'Head w/o Contrast': 140.00, 'Head w/ Contrast': 197.00, 'Head w/ & w/o Contrast': 231.00, 'Brain Perfusion': 295.00,
  'Sinus w/o Contrast': 140.00, 'Neck (Soft Tissue) w/ Contrast': 197.00,
  'Chest High Resolution (HRCT)': 165.00, 'CT Angiography Pulmonary (PE)': 231.00,
  'Abdomen & Pelvis w/ Contrast': 290.50, 'Abdomen & Pelvis w/ & w/o Contrast': 350.00,
  'Coronary Artery Calcium Score': 140.00, 'CT Coronary Angiography': 350.00,
  'Abdomen Complete': 129.00, 'Abdomen Limited': 106.00,
  'Pelvis Complete (Transabdominal)': 129.00, 'Pelvis Transvaginal': 129.00, 'Pelvis Complete (Trans & Transvaginal)': 155.00,
  'OB 1st Trimester': 129.00, 'OB 2nd/3rd Trimester': 129.00,
  'Renal Complete': 129.00, 'Renal w/ Bladder': 129.00,
  'Thyroid w/ Parathyroid': 129.00, 'Breast Unilateral': 129.00, 'Breast Bilateral': 155.00,
  'Scrotum (Testicular)': 129.00, 'Soft Tissue (Limited)': 106.00,
  'Carotid Duplex Bilateral': 165.00, 'Lower Extremity Venous Duplex Bilateral': 165.00,
  'Lower Extremity Arterial Duplex Bilateral': 165.00, 'Aorta': 129.00,
  'Chest 2 Views': 38.00, 'Chest AP Portable': 30.00,
  'Abdomen 1 View (KUB)': 30.00, 'Abdomen 2 Views': 38.00,
  'Cervical Spine 2 Views': 38.00, 'Cervical Spine 4+ Views': 52.00,
  'Lumbar Spine 2 Views': 38.00, 'Lumbar Spine 4+ Views': 52.00, 'Thoracic Spine 2 Views': 38.00,
  'Shoulder 2 Views': 38.00, 'Elbow 2 Views': 38.00, 'Wrist 2 Views': 38.00,
  'Hand 2 Views': 38.00, 'Hip 2 Views': 38.00, 'Knee 2 Views': 38.00,
  'Ankle 2 Views': 38.00, 'Foot 2 Views': 38.00, 'Pelvis 1 View': 30.00,
  'Screening Mammogram Bilateral': 164.00, 'Diagnostic Mammogram Bilateral': 161.00,
  'Diagnostic Mammogram Unilateral': 161.00, '3D Mammogram (Tomosynthesis) Bilateral': 164.00,
  'PET/CT Whole Body FDG': 1250.00, 'PET/CT Whole Body FDG w/ IV Contrast': 1350.00,
  'PET Brain FDG': 1250.00, 'PET Brain Amyloid': 1450.00,
  'DEXA Bone Density (Axial) - Spine & Hip': 95.00, 'DEXA Whole Body Composition': 115.00, 'DEXA Forearm (Peripheral)': 95.00,
  'MRA Brain w/o Contrast': 395.00, 'MRA Brain w/ Contrast': 450.00,
  'MRA Neck (Carotid) w/o Contrast': 395.00, 'MRA Neck (Carotid) w/ Contrast': 450.00,
  'MRA Chest (Aorta) w/ Contrast': 450.00, 'MRA Abdomen (Renal/Aorta) w/ Contrast': 450.00,
  'MRA Lower Extremity Runoff w/ Contrast': 495.00,
  'CTA Head (Circle of Willis)': 350.00, 'CTA Neck (Carotid/Vertebral)': 350.00,
  'CTA Chest (Aorta)': 395.00, 'CTA Abdomen/Pelvis (Aorta & Iliacs)': 395.00,
  'CTA Pulmonary (PE Protocol)': 231.00, 'CTA Coronary Angiography': 395.00,
  'Standard Treadmill Stress Test': 195.00, 'Nuclear Stress Test (Myocardial Perfusion)': 395.00,
  'Stress Echocardiogram': 350.00, 'Resting EKG / 12-Lead ECG': 45.00,
  'CT Colonography (Virtual Colonoscopy) w/o Contrast': 395.00, 'CT Colonography w/ IV Contrast': 450.00,
};

exports.seed = async function (knex) {
  // ── Idempotency guard ───────────────────────────────────────────────
  // dev.sh runs seeds on every start. If the catalog is already seeded,
  // skip entirely so real appointments/payments are never wiped.
  // To force a full re-seed: SEED_FORCE=true npx knex seed:run
  const existing = await knex('modalities').count('* as c').first();
  if (parseInt(existing.c) > 0 && process.env.SEED_FORCE !== 'true') {
    console.log('⏭  Database already seeded — skipping. (Use SEED_FORCE=true to re-seed; this DELETES all appointments.)');
    return;
  }

  // Clear all tables — children before parents to satisfy FK constraints
  await knex('payments').del();        // references appointments
  await knex('appointments').del();    // references center_pricing, protocols, centers, users
  await knex('center_pricing').del();  // references centers, protocols
  await knex('protocols').del();
  await knex('body_parts').del();
  await knex('modalities').del();
  await knex('imaging_centers').del();
  await knex('users').del();

  // ── Admin user ────────────────────────────────────────────────────────
  const adminId = uuidv4();
  await knex('users').insert({
    id: adminId,
    email: 'admin@clearscan.com',
    password_hash: await bcrypt.hash('Admin@123!', 12),
    first_name: 'Super',
    last_name: 'Admin',
    role: 'super_admin',
    is_active: true,
    email_verified: true,
  });

  // ── Imaging Centers ───────────────────────────────────────────────────
  const centerIds = {};
  const centers = [
    {
      name: 'Diagnostic Imaging Center – Frisco (Ohio Dr)',
      slug: 'dic-frisco-ohio',
      address_line1: '4525 Ohio Dr', address_line2: 'Suite 200',
      city: 'Frisco', state: 'TX', zip_code: '75035',
      latitude: 33.1584, longitude: -96.8236,
      phone: '(972) 555-0101', accreditation: 'ACR',
      same_day_appointments: true, created_by: adminId,
    },
    {
      name: 'Diagnostic Imaging Center – Frisco (Warren Pkwy)',
      slug: 'dic-frisco-warren',
      address_line1: '5616 Warren Pkwy', address_line2: 'Suite 102',
      city: 'Frisco', state: 'TX', zip_code: '75034',
      latitude: 33.1501, longitude: -96.8021,
      phone: '(972) 555-0102', accreditation: 'ACR',
      same_day_appointments: true, created_by: adminId,
    },
    {
      name: 'Diagnostic Imaging Center – Plano',
      slug: 'dic-plano',
      address_line1: '6000 W Spring Creek Pkwy', address_line2: 'Suite 150',
      city: 'Plano', state: 'TX', zip_code: '75024',
      latitude: 33.0748, longitude: -96.8245,
      phone: '(972) 555-0103', accreditation: 'ACR',
      same_day_appointments: true, created_by: adminId,
    },
    {
      name: 'North Dallas Advanced Imaging',
      slug: 'ndai-dallas',
      address_line1: '7800 LBJ Freeway', address_line2: 'Suite 300',
      city: 'Dallas', state: 'TX', zip_code: '75251',
      latitude: 32.9278, longitude: -96.7894,
      phone: '(214) 555-0201', accreditation: 'ACR',
      same_day_appointments: false, created_by: adminId,
    },
    {
      name: 'McKinney Open MRI & Imaging',
      slug: 'mckinney-mri',
      address_line1: '4300 Medical Center Dr', address_line2: null,
      city: 'McKinney', state: 'TX', zip_code: '75069',
      latitude: 33.1972, longitude: -96.6397,
      phone: '(972) 555-0301', accreditation: 'ACR',
      same_day_appointments: true, created_by: adminId,
    },
  ];
  for (const c of centers) {
    const id = uuidv4();
    centerIds[c.slug] = id;
    const phone_normalized = (c.phone || '').replace(/\D/g, '');
    await knex('imaging_centers').insert({ id, ...c, phone_normalized });
  }

  // ── Catalog: Modalities → Body Parts → Protocols ──────────────────────
  const protocolMap = {}; // name -> id
  for (const cat of CATALOG) {
    const modId = uuidv4();
    await knex('modalities').insert({
      id: modId, name: cat.modality,
      abbreviation: cat.modality.split(' ')[0],
      color_hex: cat.color, sort_order: cat.sort, is_active: true,
    });
    for (const body of cat.bodies) {
      const bodyId = uuidv4();
      await knex('body_parts').insert({ id: bodyId, modality_id: modId, name: body.name, is_active: true });
      for (const proto of body.protocols) {
        const protoId = uuidv4();
        protocolMap[proto.name] = protoId;
        await knex('protocols').insert({
          id: protoId, modality_id: modId, body_part_id: bodyId,
          name: proto.name, requires_contrast: proto.contrast, is_active: true,
        });
      }
    }
  }

  // ── Center Pricing (all centers get the same base prices for now) ─────
  const centerSlugs = Object.keys(centerIds);
  const pricingRows = [];
  for (const slug of centerSlugs) {
    for (const [protoName, price] of Object.entries(PRICES)) {
      if (protocolMap[protoName]) {
        pricingRows.push({
          id: uuidv4(),
          center_id: centerIds[slug],
          protocol_id: protocolMap[protoName],
          price: price,
          price_source: 'program',
          is_available: true,
        });
      }
    }
  }
  // Insert in batches of 500
  for (let i = 0; i < pricingRows.length; i += 500) {
    await knex('center_pricing').insert(pricingRows.slice(i, i + 500));
  }

  console.log(`✅ Seeded ${centers.length} centers, ${Object.keys(protocolMap).length} protocols, ${pricingRows.length} pricing rows`);
};

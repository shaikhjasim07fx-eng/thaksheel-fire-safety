PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS product_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  specifications_json TEXT NOT NULL DEFAULT '{}',
  datasheet_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  display_name TEXT,
  service_type TEXT NOT NULL,
  comment TEXT NOT NULL,
  publish_consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  moderated_at TEXT
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_type TEXT NOT NULL DEFAULT 'Website enquiry',
  name TEXT,
  company TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  product_category_slug TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quotation_sent','closed'))
);

CREATE TABLE IF NOT EXISTS client_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  project_type TEXT NOT NULL DEFAULT '',
  scope_summary TEXT NOT NULL DEFAULT '',
  public_permission INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO product_categories (slug, name, description) VALUES
('fire-extinguishers','Fire extinguishers','Portable and trolley-mounted fire extinguisher categories. Confirm model specifications with current manufacturer datasheets.'),
('fire-hydrant-systems','Fire hydrant systems','Hydrant equipment and system enquiries. Final design and compatibility require qualified review.'),
('fire-alarm-detection','Fire alarm and detection','Fire alarm panels, detectors and related components. Confirm compatible models and approvals.'),
('emergency-lights-signage','Emergency lights and signage','Emergency lighting and safety signage categories.'),
('personal-protective-equipment','Personal protective equipment','PPE and face-protection product enquiries.'),
('rescue-safety-equipment','Rescue and safety equipment','Rescue equipment and related safety products.'),
('foam-special-applications','Foam and special applications','Foam compounds and specialist applications. Verify compatibility and approvals for each use case.');

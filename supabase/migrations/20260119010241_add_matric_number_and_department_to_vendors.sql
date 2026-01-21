-- Add matric_number and department columns to vendors table

-- Add the matric_number column to the vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS matric_number text;

-- Add the department column to the vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS department text;

-- Add a constraint to ensure matric_number and department are not null for student vendors
-- We'll use a check constraint to enforce this only for student vendors
ALTER TABLE vendors 
ADD CONSTRAINT student_vendor_requires_matric_dept 
CHECK (
  (vendor_type != 'student' AND matric_number IS NULL AND department IS NULL) 
  OR 
  (vendor_type = 'student' AND matric_number IS NOT NULL AND department IS NOT NULL)
);
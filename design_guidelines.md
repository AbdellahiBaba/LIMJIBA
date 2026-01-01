# POLY FLECTA PLASTICA - Design Guidelines
## Business Management System

### Design Approach
**Design System:** Material Design for enterprise applications, adapted for industrial manufacturing aesthetic. Focus on data clarity, operational efficiency, and professional presentation suitable for commercial software.

### Brand Identity

**Company Name:** POLY FLECTA PLASTICA
**Industry Context:** Industrial plastic packaging manufacturing - professional, reliable, modern

**Color Palette:**
- Primary Blue: #1976D2 (industrial strength, trust)
- Dark Blue: #0D47A1 (headers, emphasis)
- Steel Grey: #546E7A (secondary elements)
- Light Grey: #ECEFF1 (backgrounds, cards)
- White: #FFFFFF (surfaces, contrast)
- Metallic Accent: #90A4AE (subtle details)
- Success Green: #43A047 (confirmations, stock status)
- Alert Orange: #FB8C00 (low stock warnings)
- Error Red: #E53935 (critical alerts)

### Typography System

**Font Stack:** Roboto (via Google Fonts CDN) - clean, modern, industrial
- Display/Headers: Roboto, 600 weight, 24-32px
- Section Headers: Roboto, 500 weight, 18-20px
- Body Text: Roboto, 400 weight, 14-16px
- Data Tables: Roboto Mono, 400 weight, 13-14px (numbers/codes)
- Small Labels: Roboto, 400 weight, 12px

### Layout System

**Spacing Units:** Tailwind spacing - use 4, 6, 8, 12, 16 units consistently
- Card padding: p-6 or p-8
- Section margins: mb-8 or mb-12
- Form field gaps: gap-6
- Button spacing: px-6 py-3

**Grid Structure:**
- Dashboard: 12-column grid with responsive breakpoints
- Module cards: max-w-7xl containers
- Data tables: full-width with horizontal scroll on mobile
- Forms: max-w-2xl centered for readability

### Component Library

**Navigation:**
- Persistent left sidebar (250px) with company logo at top
- Modules: Dashboard, Invoices, Stock, POS, Rewards, Settings
- Icons from Material Icons CDN
- Active state: primary blue background with white text
- Hover: light grey background

**Cards:**
- Elevated cards with subtle shadow (shadow-md)
- White backgrounds with rounded corners (rounded-lg)
- Stats cards: icon + metric + label, grid layout
- Module cards: header with action button, content area, footer if needed

**Data Tables:**
- Zebra striping for rows (alternate light grey)
- Fixed header on scroll
- Sortable columns with arrow indicators
- Row actions: icon buttons aligned right
- Pagination controls at bottom
- Search/filter bar above table

**Forms:**
- Full-width inputs with labels above
- Input fields: border grey, focus state primary blue
- Required fields: red asterisk
- Helper text below inputs in small grey font
- Action buttons bottom-right aligned
- Clear visual hierarchy between sections

**Buttons:**
- Primary: filled primary blue, white text, rounded-md, hover darken
- Secondary: outlined steel grey, grey text
- Danger: filled error red
- Icon buttons: circular, grey hover background
- All buttons: px-6 py-3, font-medium

**Modals/Dialogs:**
- Centered overlay with backdrop blur
- Max-width based on content (max-w-2xl typical)
- Header with title and close icon
- Content area with appropriate padding
- Footer with action buttons right-aligned

### Module-Specific Design

**Invoice Module:**
- List view: searchable table with invoice number, date, client, total, status
- PDF preview: branded header with logo, company details, invoice table matching sample format
- Action buttons: New Invoice, Print, Export, View Details

**Stock Management:**
- Card grid showing product categories
- Low stock alerts: orange badge with count
- Inventory table: product, category, quantity, unit price, total value
- Stock actions: quick add/remove buttons, batch import

**POS Interface:**
- Split screen: product grid left (2/3), cart right (1/3)
- Large product cards with image placeholder, name, price
- Cart: scrollable item list, prominent total display
- Numpad for quick quantity entry
- Payment mode selector: Cash, Card, Credit
- Print receipt button: large, primary blue

**Reseller Rewards:**
- Dashboard: cards showing active resellers, threshold metrics, pending rewards
- Reseller table: name, total purchases, progress bar to next threshold
- Winner selection: branded modal with animation placeholder
- Admin controls: threshold settings, manual adjustment options

### PDF/Print Templates

**Invoice Template:**
- Header: Company name bold 24px, logo left, contact details right
- Business info: address, registration numbers in small text
- Invoice metadata: date, number, client, payment terms in table format
- Product table: bordered, alternating row colors
- Totals section: right-aligned, bold for final total
- Footer: written amount, signature area, company branding

**POS Receipt:**
- Narrow format (80mm thermal printer)
- Company name centered, contact info
- Item list: name, qty, price aligned
- Total prominent at bottom
- Date/time, receipt number
- Thank you message with branding

### Accessibility & Quality

- Minimum font size 12px for all text
- Contrast ratio 4.5:1 for body text, 3:1 for large text
- Consistent focus states: primary blue outline
- Keyboard navigation for all interactive elements
- Loading states: circular spinners in primary blue
- Error messages: red text with icon, positioned near input

### Icons & Assets

**Icons:** Material Icons CDN throughout
- Navigation: Dashboard, Receipt, Inventory, PointOfSale, CardGiftcard
- Actions: Add, Edit, Delete, Print, Download, Search, FilterList
- Status: CheckCircle, Warning, Error, Info

**Logo:** Placeholder with "PFP" monogram or company name in modern industrial font, positioned top-left in navigation and on all printed materials

### Animation Strategy

Minimal, purposeful animations only:
- Page transitions: none (instant for business app speed)
- Modal appearance: quick fade-in (150ms)
- Button feedback: subtle scale on click
- Loading: rotating spinner only
- No decorative animations - prioritize performance and clarity
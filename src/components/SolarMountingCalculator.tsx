import React, { useState, useMemo, useRef } from 'react';
import {
  LayoutGrid,
  Rows,
  Columns,
  Grid,
  RotateCcw,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  Info,
  Download,
  Copy,
  Printer,
  Send,
  Camera,
  ZoomIn,
  ZoomOut,
  Zap,
  Scale,
  Anchor,
  Wrench,
  AlertTriangle,
  ArrowLeftRight,
  FileSpreadsheet,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sun,
  Shield,
  Layers,
  HelpCircle,
  X,
  Footprints,
  RotateCw,
  Search,
  Database,
  Trash2,
  Edit3,
  Sliders,
  Smartphone,
  Monitor,
  Repeat
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas-pro';
import { sanitizeDocumentForCanvas } from '../lib/pdfExport';
import { 
  MountingLayoutMode, 
  MountingViewMode, 
  MountingPanelPreset, 
  MountingBOQItem, 
  SupportedLanguage,
  PanelPreset,
  MountingDatabase
} from '../types';
import { DEFAULT_PANEL_PRESETS } from '../data/panelPresets';
import { SolarMountingPrintModal } from './SolarMountingPrintModal';

interface SolarMountingCalculatorProps {
  lang: SupportedLanguage;
  theme: 'dark' | 'light';
  customPanels?: PanelPreset[];
  onUpdateCustomPanels?: (panels: PanelPreset[]) => Promise<void> | void;
  onShowToast?: (msg: { text: string; type: 'success' | 'error' | 'info' }) => void;
  mountingDatabase?: MountingDatabase;
  onOpenMountingDbModal?: () => void;
}

// 4 Standard Solar Panel Presets
const PANEL_PRESETS: MountingPanelPreset[] = [
  {
    id: '550w_mono',
    name: '550W Tier-1 မိုနို (1.13m × 2.28m)',
    badge: '1.134m × 2.278m | 35mm',
    watt: 550,
    width: 1.134,
    length: 2.278,
    thickness: 35
  },
  {
    id: '580w_ntype',
    name: '580W N-Type နှစ်ဖက်မြင် (1.13m × 2.28m)',
    badge: '1.134m × 2.278m | 30mm',
    watt: 580,
    width: 1.134,
    length: 2.278,
    thickness: 30
  },
  {
    id: '450w_halfcut',
    name: '450W မိုနို Half-Cut (1.05m × 1.76m)',
    badge: '1.048m × 1.762m | 30mm',
    watt: 450,
    width: 1.048,
    length: 1.762,
    thickness: 30
  },
  {
    id: '670w_ultra',
    name: '670W Ultra High Power (1.30m × 2.38m)',
    badge: '1.303m × 2.384m | 35mm',
    watt: 670,
    width: 1.303,
    length: 2.384,
    thickness: 35
  }
];

// Rail Length Options (Dropdown)
const RAIL_OPTIONS = [
  { value: 4.20, label: '4.20 m (စံသတ်မှတ်ချက် - Standard)', isStandard: true },
  { value: 4.70, label: '4.70 m', isStandard: false },
  { value: 3.20, label: '3.20 m', isStandard: false },
  { value: 2.40, label: '2.40 m', isStandard: false },
  { value: 2.10, label: '2.10 m', isStandard: false },
  { value: 4.80, label: '4.80 m', isStandard: false },
  { value: 6.00, label: '6.00 m', isStandard: false }
];

// Roof Mount Types
const ROOF_MOUNT_TYPES = [
  {
    id: 'l_feet',
    nameMy: 'L-Feet တပ်ဆင်ခွင် (သွပ်မိုး / Corrugated Sheet)',
    nameEn: 'L-Feet Kit (Corrugated Sheet Roof)',
    nameZh: 'L型地脚支架 (彩钢瓦/波浪板屋顶)',
    descMy: 'သွပ်မိုးများတွင် ရေလုံ EPDM ရာဘာပါရှိပြီး ဝက်အူဖြင့် တွဲစပ်အသုံးပြုရန်',
    descEn: 'EPDM waterproof rubber pad with self-tapping screw for metal corrugated roofs',
    descZh: '配有EPDM防水胶垫与自攻螺丝，适用于各类彩钢瓦金属屋顶',
    spec: 'Span: 1.2m interval, EPDM Washer & M8 Bolt',
    defaultPrice: 4500
  },
  {
    id: 'tile_hook',
    nameMy: 'ကြွေပြား/အုတ်ကြွပ်မိုး ချိတ် (Tile Hook)',
    nameEn: 'Tile Roof Hook',
    nameZh: '瓦屋面挂钩 (琉璃瓦/水泥瓦屋顶)',
    descMy: 'ကြွေပြားမိုးများအောက် သစ်သား/သံထုတ်နှင့် ချိတ်ဆက်အသုံးပြုရန်',
    descEn: 'Stainless steel bracket for tile roofs, mounted directly to rafters/battens',
    descZh: '304不锈钢弯钩，深入瓦片下方固定于木梁或钢桁条上',
    spec: 'SUS304 Stainless Steel Tile Bracket',
    defaultPrice: 6500
  },
  {
    id: 'klip_lok',
    nameMy: 'အပေါက်ဖောက်စရာမလိုသော Seam Clamp (Klip-lok)',
    nameEn: 'Standing Seam / Klip-lok Clamp',
    nameZh: '无缝直立锁边夹具 (Klip-lok/角驰屋面)',
    descMy: 'သွပ်မိုးအပေါက်မဖောက်ဘဲ Klip-lok အစွန်းတွင် ညှပ်ရန်',
    descEn: 'Non-penetrating clamp for standing seam and concealed-fix metal roofs',
    descZh: '无损免打孔夹具，直接夹紧锁边咬口，完全杜绝漏水隐患',
    spec: 'Non-penetrating AL6005-T5 Clamp',
    defaultPrice: 5500
  },
  {
    id: 'tripod',
    nameMy: 'ထောင့်စောင်း ချိန်ညှိနိုင်သော Tripod (ကွန်ကရစ်ခေါင်မိုး)',
    nameEn: 'Adjustable Tilt Tripod (Flat / Concrete Roof)',
    nameZh: '可调角度三角支架 (平顶/水泥屋面)',
    descMy: 'ကွန်ကရစ် ကြမ်းပြင်/ခေါင်မိုးများတွင် ဒီဂရီချိန်ညှိရန်',
    descEn: 'Adjustable triangle frame (10°-30°) for flat concrete rooftops and ground',
    descZh: '倾角10°-30°可调三角铝合金支架，适用于水泥平屋顶及地面',
    spec: '10°-30° Adjustable Tilt Triangle Frame',
    defaultPrice: 18500
  },
  {
    id: 'hanger_bolt',
    nameMy: 'M10 Hanger Bolt ဝက်အူရှည် (သစ်သား/သံထုတ်)',
    nameEn: 'M10 Hanger Bolt with EPDM',
    nameZh: 'M10 双头挂钩螺栓 (木梁/轻钢檩条)',
    descMy: 'သွပ်မိုးမှတစ်ဆင့် အောက်ခံထုတ်တန်းနှင့် တွဲစပ်ရန်',
    descEn: 'M10 double-ended hanger bolt penetrating roof sheet into purlins',
    descZh: 'M10不锈钢双头挂钩螺栓，穿透屋面板稳固锚固于檩条结构',
    spec: 'M10 x 200mm SUS304 with Adapter Plate',
    defaultPrice: 4800
  }
];

// Frame Thickness Options
const FRAME_THICKNESS_OPTIONS = [
  { value: 35, label: '35 mm (Heavy Duty 550W+ Standard)' },
  { value: 30, label: '30 mm (Modern N-Type / Half-Cut Standard)' },
  { value: 40, label: '40 mm (Commercial Heavy Frame)' },
  { value: 28, label: '28 mm (Ultra Slim Frame)' }
];

// Default Unit Prices in MMK (Kyats)
const DEFAULT_PRICES: Record<string, number> = {
  rail: 32000,
  end_clamp: 1800,
  mid_clamp: 1900,
  splice: 4200,
  roof_bracket: 4500,
  grounding_lug: 3500,
  bonding_clip: 800,
  cable_clip: 400,
  walkway_grating: 45000,
  walkway_bracket: 8500,
  substructure_beam: 38000
};

export const SolarMountingCalculator: React.FC<SolarMountingCalculatorProps> = ({
  lang,
  theme,
  customPanels = [],
  onUpdateCustomPanels,
  onShowToast,
  mountingDatabase,
  onOpenMountingDbModal
}) => {
  // 1. Layout Mode: Exclusively 2D Matrix with Walkway & Orientation
  const [layoutMode] = useState<MountingLayoutMode>('matrix_2d');
  const [matrixRows, setMatrixRows] = useState<number>(2);
  const [matrixCols, setMatrixCols] = useState<number>(6);
  const [matrixGrid, setMatrixGrid] = useState<boolean[][]>(() => [
    [true, true, true, true, false, false],
    [true, true, true, true, false, false]
  ]);

  // Collapsible BOQ state (Accordion with down arrow toggle)
  const [isBoqExpanded, setIsBoqExpanded] = useState<boolean>(false);

  // Orientation State (Portrait vs Landscape) - Global & Per-cell
  const [globalOrientation, setGlobalOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [matrixOrientation, setMatrixOrientation] = useState<('portrait' | 'landscape')[][]>(() => [
    ['portrait', 'portrait', 'portrait', 'portrait', 'portrait', 'portrait'],
    ['portrait', 'portrait', 'portrait', 'portrait', 'portrait', 'portrait']
  ]);
  // Diagram Interaction Mode: 'toggle_cell' (place/remove) or 'toggle_orientation' (click to rotate)
  const [diagramInteractionMode, setDiagramInteractionMode] = useState<'toggle_cell' | 'toggle_orientation'>('toggle_cell');
  const [showSubstructureBeams, setShowSubstructureBeams] = useState<boolean>(true); // သံ ဖရိန်နှင့် ပင်မ Beam များ ပြသမှု

  // Walkway Feature State - Flexible at ANY custom rows & columns
  const [hasWalkway, setHasWalkway] = useState<boolean>(false); // false = Walkway မပါ, true = Walkway ပါမည်
  const [walkwayType, setWalkwayType] = useState<'rows' | 'cols' | 'both'>('rows');
  // walkwayRows: 1-based indices of row dividers after which a horizontal walkway is placed (e.g. [1] = after Row 1)
  const [walkwayRows, setWalkwayRows] = useState<number[]>([1]);
  // walkwayCols: 1-based indices of col dividers after which a vertical walkway is placed (e.g. [3] = after Col 3)
  const [walkwayCols, setWalkwayCols] = useState<number[]>([3]);
  const [walkwayWidthM, setWalkwayWidthM] = useState<number>(0.60); // standard 600mm
  const [includeWalkwayBoq, setIncludeWalkwayBoq] = useState<boolean>(true);

  // 2. Solar Panel Specs & Database Integration State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('panel_jinko_585_tiger_neo');
  const [panelWatt, setPanelWatt] = useState<number>(585);
  const [panelWidth, setPanelWidth] = useState<number>(1.134);
  const [panelLength, setPanelLength] = useState<number>(2.278);
  const [panelThickness, setPanelThickness] = useState<number>(30);
  const [panelVoc, setPanelVoc] = useState<number>(51.9);
  const [panelVmp, setPanelVmp] = useState<number>(43.8);

  // Panel Database Modal & Add Custom Panel Form State
  const [showPanelDbModal, setShowPanelDbModal] = useState<boolean>(false);
  const [panelDbSearchQuery, setPanelDbSearchQuery] = useState<string>('');
  const [showAddPanelForm, setShowAddPanelForm] = useState<boolean>(false);
  const [newPanelForm, setNewPanelForm] = useState({
    name: '',
    watt: 585,
    lengthMm: 2278,
    widthMm: 1134,
    thickness: 30,
    voc: 51.9,
    vmp: 43.8
  });

  // 3. Mounting Hardware Parameters
  const [railLength, setRailLength] = useState<number>(4.20);
  const [roofMountType, setRoofMountType] = useState<string>('l_feet');
  const [includeGrounding, setIncludeGrounding] = useState<boolean>(true);
  const [includeCableClips, setIncludeCableClips] = useState<boolean>(true);
  const [includeSpareMargin, setIncludeSpareMargin] = useState<boolean>(false);

  // 4. Quotation & Project Details State
  const [customerName, setCustomerName] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({ ...DEFAULT_PRICES });
  const [showPrintQuotationModal, setShowPrintQuotationModal] = useState<boolean>(false);

  // 5. Diagram & Viewer State
  const [viewMode, setViewMode] = useState<MountingViewMode>('blueprint');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [diagramScaleMode, setDiagramScaleMode] = useState<'compact' | 'medium' | 'large'>('compact');
  const diagramRef = useRef<HTMLDivElement>(null);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  // Multi-Language Translation Dictionary
  const t = useMemo(() => {
    if (lang === 'en') {
      return {
        section1Title: "1. Solar System Layout & 2D Matrix",
        section1Desc: "Configure panel count, rows, columns, and 2D matrix layout freely",
        resetDefault: "Reset to Default",
        layoutModeTitle: "LAYOUT MODE - 2D MATRIX GRID",
        layoutModeDesc: "Directly select and arrange solar panel cells in a 2D grid",
        totalSummary: "Total:",
        rowsUnit: "Rows",
        panelsUnit: "Panels",
        walkwayOption: "MAINTENANCE WALKWAY OPTION",
        walkwayOptionDesc: "Enable or disable walkways for panel cleaning and inspection",
        walkwayEnabled: "ENABLED",
        walkwayWithout: "Without Walkway (Continuous)",
        walkwayWith: "With Maintenance Walkway",
        walkwayWithoutDesc: "Continuous array without walkway gaps",
        walkwayWithDesc: "Add walkway corridors for panel maintenance & cleaning",
        walkwayPlacementType: "Walkway Placement Type:",
        walkwayTypeRows: "Between Rows (Horizontal)",
        walkwayTypeCols: "Between Columns (Vertical)",
        walkwayTypeBoth: "Both Rows & Columns",
        walkwayWidth: "WALKWAY WIDTH",
        includeInBoq: "Include Walkway in BOQ Quotation",
        globalOrientation: "ARRAY ORIENTATION PRESET",
        globalOrientationDesc: "Set orientation for all panels at once",
        allPortrait: "📱 All Portrait",
        allLandscape: "💻 All Landscape",
        matrixHeader: "2D Matrix Solar Panel Layout",
        matrixDesc: "Click cells to toggle ON/OFF, and click 🔄 to rotate individual panels",
        selectAll: "Select All",
        clearAll: "Clear All",
        invertSelection: "Invert",
        preset4x2: "4×2 Panels",
        preset6x2: "6×2 Panels",
        rowsCount: "NUMBER OF ROWS",
        colsCount: "NUMBER OF COLUMNS",
        rotateRow: "Rotate",
        walkwayBetweenRows: "── WALKWAY (Inspection Walkway {width} mm) ──",
        removeWalkway: "✕ Remove",
        landscapeBadge: "Landscape",
        portraitBadge: "Portrait",
        scrollHintCols: "Swipe / scroll horizontally using the bottom scrollbar to view all {cols} columns",
        horizontalScrollEnabled: "Horizontal Scroll Enabled",

        panelSpecsTitle: "SOLAR PANEL DATABASE & SPECS",
        panelSpecsDesc: "Select standard panels from database or enter custom length, width, thickness",
        openPanelDb: "Panel Database ({count})",
        selectedPanelModel: "SELECTED PANEL MODEL",
        lengthLabel: "Length:",
        widthLabel: "Width:",
        thicknessLabel: "Thickness:",
        powerLabel: "Power:",
        saveCurrentDimensions: "Save Size to Database",
        panelLengthMm: "PANEL LENGTH (MM)",
        panelWidthMm: "PANEL WIDTH (MM)",
        panelThicknessMm: "PANEL THICKNESS (MM)",
        panelWattLabel: "PANEL WATTAGE (W)",

        section2Title: "2. Required Solar Mounting Hardware List",
        section2Desc: "{panels} Panels × {rows} Rows = Total hardware required for {panels} panels",
        hardwareWeight: "~{weight} kg Hardware",
        endClampTitle: "END CLAMP",
        endClampSub: "4 PER ROW",
        midClampTitle: "MID CLAMP",
        midClampSub: "2 PER JOINT",
        railsTitle: "GI RAILS",
        railsSub: "BARS (4.2M)",
        bracketsTitle: "ROOF MOUNT BRACKETS",
        bracketsSub: "L-FEET / HOOKS",
        unitPairs: "Pairs",
        unitBars: "Bars",
        unitPcs: "Pcs",
        unitMeters: "Meters",
        roofTypeLabel: "ROOF MOUNT TYPE",
        roofTypeDesc: "Select fixing brackets matching roof structure",
        railLengthLabel: "GI RAIL LENGTH",
        railLengthDesc: "Select standard rail bar length",
        hardwareAddons: "Hardware Accessories & Safety Margins",
        groundingClips: "Grounding Lug & Earth Clips",
        groundingDesc: "Lightning & static protection for panels & rails",
        cableClips: "UV Solar Cable Clips",
        cableDesc: "Stainless steel wire management clips under rails",
        spareMargin: "5% Extra Spare Margin",
        spareDesc: "Add 5% extra hardware bolts & nuts buffer",

        section3Title: "3. Array Schematic Diagram (ARRAY BLUEPRINT)",
        section3Desc: "Visual blueprint of solar panels, GI rails, mid clamps, end clamps, and walkways",
        totalWidth: "Total Width",
        totalLength: "Total Length",
        totalPanelsCount: "Total Panels",
        totalCapacity: "Total Capacity",
        endClampLegend: "End Clamp",
        midClampLegend: "Mid Clamp",
        giRailLegend: "GI Rails",
        spliceJoinerLegend: "Splice Joiner",
        structuralPreview: "STRUCTURAL PREVIEW // BLUEPRINT",
        diagramSize: "Diagram Size:",
        sizeCompact: "Compact",
        sizeMedium: "Medium",
        sizeLarge: "Large",
        resetZoom: "Reset",
        savePhoto: "Photo Download",
        savingPhoto: "Saving...",
        modeToggleCell: "Toggle ON/OFF",
        modeRotate: "Rotate Panel (🔄)",
        scrollHintDiagram: "Array has {cols} columns. Use the bottom scrollbar to scroll horizontally.",

        section4Title: "4. Bill of Quantities & Quotation (Quotation / BOQ)",
        section4Desc: "Calculate total mounting hardware quantities, pricing, and export quotation",
        resetPrices: "Reset Prices",
        customerName: "Customer / Client Name:",
        projectName: "Project / Site Location:",
        quotationDate: "Date:",
        tableItemName: "Item Name",
        tableSpecs: "SPECS",
        tableQty: "Qty",
        tablePrice: "Unit Price (MMK)",
        tableTotal: "Total (MMK)",
        subtotalPrice: "Subtotal Hardware Price:",
        discountLabel: "Discount (%):",
        grandTotal: "Grand Total:",
        copyBoq: "Copy BOQ Text",
        exportCsv: "Export Excel (CSV)",
        printA4: "Print / PDF (A4)",

        walkwayDirectionLabel: "WALKWAY DIRECTION",
        walkwayDirectionHint: "Insert walkways between any custom rows or columns",
        walkwayBetweenCols: "Between Col {c1} & Col {c2}",
        orientationSectionTitle: "PANEL ORIENTATION - Portrait & Landscape",
        orientationSectionDesc: "Set portrait/landscape for all panels or rotate individual panels in 2D grid",
        rowsUnitLabel: "Rows",
        colsUnitLabel: "Columns",
        railLengthDropdown: "GI RAIL BAR LENGTH (METERS)",
        railStandardNote: "Standard commercial rail length:",
        customerPlaceholder: "e.g. John Doe (Yangon)",
        projectPlaceholder: "e.g. 5kW Residential On-Grid Roof",
        copyQuotationBtn: "Copy Quotation Text (Viber / Telegram)",
        printQuotationBtn: "Print Quotation / Save PDF",
        downloadCsvBtn: "Download CSV",

        section5Title: "5. Mounting Precautions & Technical Best Practices",
        section5Desc: "Engineering standards and safety guidelines for solar installers",
        torqueTitle: "Bolt Torque Setting",
        torqueDesc: "Tighten M8 Allen bolts evenly to 12-14 N·m. Over-torquing can damage panel frames and glass.",
        overhangTitle: "Rail Overhang Limit",
        overhangDesc: "Rail cantilever extension past the final L-foot or hook should not exceed 400mm (0.4m).",
        thermalTitle: "Thermal Expansion Gaps",
        thermalDesc: "Leave 20-30mm thermal expansion gaps every 15 meters of continuous rail runs to prevent buckling.",
        groundingTitle: "Lightning & Grounding Bond",
        groundingBestPracticeDesc: "Bond all panel frames and rails systematically with grounding lugs and piercing bonding clips.",

        modalTitle: "Solar Panel Database",
        modalSub: "Manage standard & custom panels (Length × Width × Thickness)",
        searchPlaceholder: "Search panels (Brand, Model, Watts)...",
        addNewPanel: "Add Custom Panel"
      };
    }

    if (lang === 'zh') {
      return {
        section1Title: "1. 光伏安装排布与2D矩阵设计",
        section1Desc: "自由配置组件数量、行数、列数及2D矩阵排布方式",
        resetDefault: "恢复默认",
        layoutModeTitle: "排布模式 (LAYOUT MODE) - 2D矩阵网格",
        layoutModeDesc: "在2D网格中直接点选组件开关及调整旋转方向",
        totalSummary: "总计:",
        rowsUnit: "排",
        panelsUnit: "块",
        walkwayOption: "运维检修走道设置 (MAINTENANCE WALKWAY)",
        walkwayOptionDesc: "选择是否在阵列间配置清洗维护检修通道",
        walkwayEnabled: "已启用",
        walkwayWithout: "不含走道 (连续紧密排布)",
        walkwayWith: "包含检修通道",
        walkwayWithoutDesc: "光伏组件紧密排布，无中间间隔走道",
        walkwayWithDesc: "插入标准走道，方便日常清洗维护与检查",
        walkwayPlacementType: "通道位置类型:",
        walkwayTypeRows: "行间走道 (水平横向)",
        walkwayTypeCols: "列间走道 (垂直纵向)",
        walkwayTypeBoth: "行与列双向走道",
        walkwayWidth: "通道宽度 (WALKWAY WIDTH)",
        includeInBoq: "将走道计入材料清单 (BOQ)",
        globalOrientation: "整列方向预设",
        globalOrientationDesc: "一键批量设置所有组件方向",
        allPortrait: "📱 全部竖排 (Portrait)",
        allLandscape: "💻 全部横排 (Landscape)",
        matrixHeader: "2D 矩阵组件排布表格",
        matrixDesc: "点击方格开关组件，点击 🔄 按钮旋转横竖方向",
        selectAll: "全选",
        clearAll: "全清",
        invertSelection: "反选",
        preset4x2: "4×2 阵列",
        preset6x2: "6×2 阵列",
        rowsCount: "排数 (ROWS)",
        colsCount: "列数 (COLUMNS)",
        rotateRow: "整排旋转",
        walkwayBetweenRows: "── 检修走道 (运维通道宽度 {width} mm) ──",
        removeWalkway: "✕ 删除",
        landscapeBadge: "横排",
        portraitBadge: "竖排",
        scrollHintCols: "已配置 {cols} 列，可在底部滑动条左右滚动查看完整组件",
        horizontalScrollEnabled: "水平滚动已启用",

        panelSpecsTitle: "光伏组件数据库与尺寸规格",
        panelSpecsDesc: "可从数据库选择预设组件，或手动输入长宽高尺寸",
        openPanelDb: "组件数据库 ({count})",
        selectedPanelModel: "当前选择组件型号",
        lengthLabel: "长度:",
        widthLabel: "宽度:",
        thicknessLabel: "厚度:",
        powerLabel: "功率:",
        saveCurrentDimensions: "保存尺寸到数据库",
        panelLengthMm: "组件长度 (MM)",
        panelWidthMm: "组件宽度 (MM)",
        panelThicknessMm: "组件厚度 (MM)",
        panelWattLabel: "组件标称功率 (W)",

        section2Title: "2. 所需光伏支架配件清单",
        section2Desc: "{panels} 块 × {rows} 排 = 共计 {panels} 块组件所需支架配件",
        hardwareWeight: "~{weight} kg 支架配件重量",
        endClampTitle: "边压块 (END CLAMP)",
        endClampSub: "每排 4 套",
        midClampTitle: "中压块 (MID CLAMP)",
        midClampSub: "每接缝 2 套",
        railsTitle: "光伏导轨 (GI RAILS)",
        railsSub: "单根 (4.2M)",
        bracketsTitle: "屋顶固定支架",
        bracketsSub: "L脚 / 挂钩",
        unitPairs: "套",
        unitBars: "根",
        unitPcs: "个",
        unitMeters: "米",
        roofTypeLabel: "屋顶支架固定类型",
        roofTypeDesc: "根据屋顶材质选择匹配的固定挂钩与底座",
        railLengthLabel: "导轨单根长度",
        railLengthDesc: "选择标准铝合金/镀锌导轨单根长度",
        hardwareAddons: "五金附件与安全冗余",
        groundingClips: "接地端子与防雷接地片",
        groundingDesc: "为光伏组件与导轨提供静电与接地保护",
        cableClips: "光伏线缆卡扣 (UV)",
        cableDesc: "导轨下沿不锈钢卡线扣，整洁固定直流电缆",
        spareMargin: "5% 耗损冗余备用",
        spareDesc: "额外增加 5% 螺栓螺母与卡扣备用件",

        section3Title: "3. 光伏阵列排布原理图 (ARRAY SCHEMATIC DIAGRAM)",
        section3Desc: "可视化展示组件排布、导轨走线、中压块、边压块及检修走道位置",
        totalWidth: "总宽度",
        totalLength: "总长度",
        totalPanelsCount: "组件总数",
        totalCapacity: "系统总功率",
        endClampLegend: "边压块",
        midClampLegend: "中压块",
        giRailLegend: "导轨",
        spliceJoinerLegend: "连接件",
        structuralPreview: "结构蓝图预览 // BLUEPRINT",
        diagramSize: "显示尺寸:",
        sizeCompact: "紧凑 (Compact)",
        sizeMedium: "中等 (Medium)",
        sizeLarge: "大图 (Large)",
        resetZoom: "重置",
        savePhoto: "导出图纸照片",
        savingPhoto: "保存中...",
        modeToggleCell: "点选开关",
        modeRotate: "旋转组件 (🔄)",
        scrollHintDiagram: "当前阵列包含 {cols} 列，可使用底部滚动条左右滑动查看全部内容",

        section4Title: "4. 材料清单与报价表 (Quotation / BOQ)",
        section4Desc: "自动计算光伏支架配件用量，支持单价调整与导出报价清单",
        resetPrices: "重置标准单价",
        customerName: "客户 / 业主名称:",
        projectName: "工程项目地点:",
        quotationDate: "日期:",
        tableItemName: "配件名称",
        tableSpecs: "规格参数",
        tableQty: "数量",
        tablePrice: "单价 (MMK)",
        tableTotal: "金额 (MMK)",
        subtotalPrice: "配件小计金额:",
        discountLabel: "优惠折扣 (%):",
        grandTotal: "总计金额:",
        copyBoq: "复制材料清单文本",
        exportCsv: "导出 Excel (CSV)",
        printA4: "打印 / 保存 PDF (A4)",

        walkwayDirectionLabel: "通道位置方向 (WALKWAY DIRECTION)",
        walkwayDirectionHint: "可在任意指定行间或列间插入检修走道",
        walkwayBetweenCols: "第 {c1} 列与第 {c2} 列之间",
        orientationSectionTitle: "组件排布朝向 - 横排与竖排 (Portrait & Landscape)",
        orientationSectionDesc: "支持批量切换全阵列横竖朝向，或在网格中单独旋转任意光伏组件",
        rowsUnitLabel: "排",
        colsUnitLabel: "列",
        railLengthDropdown: "单根导轨标准长度 (米)",
        railStandardNote: "常用标准商业导轨长度:",
        customerPlaceholder: "例如: 张先生 (仰光)",
        projectPlaceholder: "例如: 5kW 屋顶并网电站",
        copyQuotationBtn: "复制报价文本 (Viber / Telegram)",
        printQuotationBtn: "打印报价单 / 保存PDF",
        downloadCsvBtn: "下载 CSV 表格",

        section5Title: "5. 光伏安装注意事项与技术规范",
        section5Desc: "光伏工程师与施工安装人员应遵循的标准规范",
        torqueTitle: "螺栓紧固力矩 (Bolt Torque)",
        torqueDesc: "M8 内六角螺栓建议紧固力矩为 12-14 N·m，切勿过度拧紧，以免损伤光伏组件铝边框及钢化玻璃。",
        overhangTitle: "导轨悬臂外挑限制 (Overhang Limit)",
        overhangDesc: "最外侧 L脚或固定挂钩至导轨末端的悬臂挑出距离不得超过 400mm (0.4m)。",
        thermalTitle: "热胀冷缩伸缩缝 (Thermal Expansion)",
        thermalDesc: "对于连续长度超过 15 米的导轨排布，应每隔 15 米预留 20-30mm 伸缩缝，以防热胀冷缩导致形变拱起。",
        groundingTitle: "防雷接地与等电位连接 (Grounding)",
        groundingBestPracticeDesc: "所有组件铝合金边框与金属导轨均须使用接地穿刺垫片及接地端子进行可靠等电位跨接。",

        modalTitle: "光伏组件数据库 (SOLAR PANEL DATABASE)",
        modalSub: "管理标准与自定义组件尺寸规格 (长 × 宽 × 厚度)",
        searchPlaceholder: "搜索组件 (品牌、型号、功率)...",
        addNewPanel: "添加自定义组件"
      };
    }

    // Default: Burmese (my)
    return {
      section1Title: "၁။ တပ်ဆင်မည့် ဆိုလာစနစ် အချက်အလက်များ",
      section1Desc: "ဆိုလာပြား အရေအတွက်၊ အတန်းလိုက်၊ ကော်လံလိုက်နှင့် အကွက်လိုက် ပုံစံများကို မိမိစိတ်ကြိုက် ရွေးချယ်နိုင်ပါသည်",
      resetDefault: "မူလအခြေအနေသို့ ပြန်ထားမည်",
      layoutModeTitle: "တပ်ဆင်မှု စီစဉ်ပုံ (LAYOUT MODE) - 2D Matrix အကွက်ရွေးစနစ်",
      layoutModeDesc: "ဆိုလာပြားများကို 2D Grid အကွက်လိုက် တိုက်ရိုက်စိတ်ကြိုက် ရွေးချယ်နိုင်ပါသည်",
      totalSummary: "စုစုပေါင်း:",
      rowsUnit: "တန်း",
      panelsUnit: "ချပ်",
      walkwayOption: "စစ်ဆေးပြုပြင်ရေး လျှောက်လမ်း (MAINTENANCE WALKWAY OPTION)",
      walkwayOptionDesc: "ဆိုလာပြားများ သန့်ရှင်းရေးနှင့် စစ်ဆေးပြုပြင်ရန် လူလျှောက်လမ်း ထည့်သွင်းခြင်း/မထည့်သွင်းခြင်း ရွေးချယ်ပါ",
      walkwayEnabled: "ENABLED",
      walkwayWithout: "Walkway မပါ (ဆက်တိုက်)",
      walkwayWith: "Walkway ပါမည်",
      walkwayWithoutDesc: "ဆိုလာပြားများကို ခြားနားမှုမရှိ ဆက်တိုက်တပ်ဆင်မည် (Continuous Array)",
      walkwayWithDesc: "ဆိုလာပြား သန့်ရှင်းရေးနှင့် စစ်ဆေးရန် လူလျှောက်လမ်း စင်္ကြံ ထည့်သွင်းမည်",
      walkwayPlacementType: "Walkway ထည့်မည့် ပုံစံ:",
      walkwayTypeRows: "အတန်းလိုက် (Between Rows)",
      walkwayTypeCols: "ကော်လံလိုက် (Between Columns)",
      walkwayTypeBoth: "အတန်းရော ကော်လံပါ (Both Rows & Cols)",
      walkwayWidth: "လျှောက်လမ်း အကျယ် (WALKWAY WIDTH)",
      includeInBoq: "BOQ ပစ္စည်းစာရင်းတွင် Walkway ကုန်ကျစရိတ် ထည့်တွက်မည်",
      globalOrientation: "ဆိုလာပြား ထောင်လိုက်/လှဲလိုက် သတ်မှတ်မှု (GLOBAL ORIENTATION)",
      globalOrientationDesc: "ဆိုလာပြားအားလုံးကို ဒေါင်လိုက် (Portrait) သို့မဟုတ် အလျားလိုက် (Landscape) တစ်ပြိုင်နက် သတ်မှတ်ပါ",
      allPortrait: "📱 အားလုံး ဒေါင်လိုက် (Portrait)",
      allLandscape: "💻 အားလုံး အလျားလိုက် (Landscape)",
      matrixHeader: "2D Matrix ဆိုလာပြား အကွက်များ သတ်မှတ်ခြင်း",
      matrixDesc: "အကွက်များကို ကလစ်နှိပ်၍ အဖွင့်/အပိတ် ပြုလုပ်ပြီး 🔄 ခလုတ်ဖြင့် ဒေါင်လိုက်/အလျားလိုက် လှည့်နိုင်ပါသည်",
      selectAll: "အားလုံး ရွေးမည်",
      clearAll: "အကုန်ရှင်းမည်",
      invertSelection: "ပြောင်းပြန်",
      preset4x2: "၄×၂ ပြား",
      preset6x2: "၆×၂ ပြား",
      rowsCount: "အတန်းအရေအတွက် (ROWS)",
      colsCount: "ကော်လံအရေအတွက် (COLUMNS)",
      rotateRow: "လှည့်",
      walkwayBetweenRows: "── WALKWAY (စစ်ဆေးရေး လျှောက်လမ်း {width} mm) ──",
      removeWalkway: "✕ ဖျက်မည်",
      landscapeBadge: "Landscape",
      portraitBadge: "Portrait",
      scrollHintCols: "ကော်လံ {cols} ခု ရှိသဖြင့် ညာဘက်အကွက်များသို့ အောက်ခြေ Scrollbar ဖြင့် ရွှေ့ကြည့်ရှုနိုင်ပါသည်",
      horizontalScrollEnabled: "Horizontal Scroll Enabled",

      panelSpecsTitle: "ဆိုလာပြား အမျိုးအစားနှင့် အတိုင်းအတာ (SOLAR PANEL DATABASE & SPECS)",
      panelSpecsDesc: "ဒေတာဘေ့စ်မှ စံပြားများ ရွေးချယ်နိုင်ပြီး မိမိစိတ်ကြိုက် အလျား၊ အကျယ်၊ အထူ စသည်တို့ကို ထည့်သွင်းသိမ်းဆည်းနိုင်ပါသည်",
      openPanelDb: "ဆိုလာပြား ဒေတာဘေ့စ် ({count})",
      selectedPanelModel: "SELECTED PANEL MODEL",
      lengthLabel: "အလျား:",
      widthLabel: "အကျယ်:",
      thicknessLabel: "အထူ:",
      powerLabel: "ပါဝါ:",
      saveCurrentDimensions: "လက်ရှိ Size ကို Database ထဲသိမ်းမည်",
      panelLengthMm: "ဆိုလာပြား အလျား (LENGTH - MM)",
      panelWidthMm: "ဆိုလာပြား အကျယ် (WIDTH - MM)",
      panelThicknessMm: "ဆိုလာပြား အထူ (THICKNESS - MM)",
      panelWattLabel: "ဆိုလာပြား ဝပ်အား (POWER - WATT)",

      section2Title: "၂။ လိုအပ်သော ဆိုလာတပ်ဆင်ရေး ပစ္စည်းများ စာရင်း",
      section2Desc: "{panels} ချပ် × {rows} တန်း = စုစုပေါင်း {panels} ချပ်အတွက် လိုအပ်ချက်",
      hardwareWeight: "~{weight} kg Hardware",
      endClampTitle: "END CLAMP (အစွန်းထိန်းကလစ်)",
      endClampSub: "4 PER ROW",
      midClampTitle: "MID CLAMP (အလယ်ထိန်းကလစ်)",
      midClampSub: "2 PER JOINT",
      railsTitle: "GI RAILS (အလူမီနီယမ် / သံမဏိ ရထားလမ်း)",
      railsSub: "BARS (4.2M)",
      bracketsTitle: "ROOF MOUNT BRACKETS (ခေါင်မိုး အောက်ခံခွင်)",
      bracketsSub: "L-FEET / HOOKS",
      unitPairs: "စုံ(ခု)",
      unitBars: "ချောင်း",
      unitPcs: "ခု",
      unitMeters: "မီတာ",
      roofTypeLabel: "ခေါင်မိုး အမျိုးအစား (ROOF TYPE / MOUNTING FEET)",
      roofTypeDesc: "ခေါင်မိုး တည်ဆောက်ပုံနှင့် ကိုက်ညီသော ချိတ်ဆွဲကိရိယာ ရွေးပါ",
      railLengthLabel: "GI Rail ချောင်း အရှည် (RAIL LENGTH)",
      railLengthDesc: "အသုံးပြုမည့် GI Rail တစ်ချောင်းချင်းစီ၏ အရှည် ရွေးပါ",
      hardwareAddons: "ဆက်စပ်ပစ္စည်းများနှင့် အပိုဆောင်း ကိရိယာများ",
      groundingClips: "Grounding Lug & Earth Clips",
      groundingDesc: "ဆိုလာပြားနှင့် Rail များအတွက် မြေစိုက်လိုင်းနှင့် မိုးကြိုးဘေးကင်းရေး",
      cableClips: "UV Solar Cable Clips",
      cableDesc: "Rail အောက်တွင် ဝါယာကြိုးများ သပ်ရပ်စွာ ထိန်းသိမ်းရန် ကလစ်များ",
      spareMargin: "5% အပိုဆောင်း သတ်မှတ်ချက် (Spare Margin)",
      spareDesc: "မူလီ၊ ဘိုတာ၊ ကလစ်များ ပျောက်ရှ/ပျက်စီးမှုအတွက် ၅% အပိုထည့်တွက်မည်",

      section3Title: "၃။ ဆိုလာပြား တပ်ဆင်မှု ပုံကြမ်း (ARRAY SCHEMATIC DIAGRAM)",
      section3Desc: "ဆိုလာပြားများ၊ GI Rail၊ Mid Clamp၊ End Clamp နှင့် Splice ဆက်နေရာများကို ပုံကြမ်းဖြင့် ကြည့်ရှုနိုင်ပါသည်",
      totalWidth: "စုစုပေါင်း အကျယ်",
      totalLength: "စုစုပေါင်း အလျား",
      totalPanelsCount: "ဆိုလာပြား စုစုပေါင်း",
      totalCapacity: "စနစ် ထွက်ရှိမည့် စွမ်းအား",
      endClampLegend: "End Clamp",
      midClampLegend: "Mid Clamp",
      giRailLegend: "GI Rails",
      spliceJoinerLegend: "Splice Joiner",
      structuralPreview: "STRUCTURAL PREVIEW // ဖွဲ့စည်းပုံ နမူနာ",
      diagramSize: "ပုံအရွယ်အစား:",
      sizeCompact: "အသေး (Compact)",
      sizeMedium: "ပုံအလယ်အလတ် (Medium)",
      sizeLarge: "ပုံအကြီး (Large)",
      resetZoom: "Reset",
      savePhoto: "Photo Download",
      savingPhoto: "သိမ်းဆည်းနေသည်...",
      modeToggleCell: "Cell အဖွင့်/အပိတ်",
      modeRotate: "လှည့်မည် (🔄)",
      scrollHintDiagram: "ကော်လံ {cols} ခု ရှိသဖြင့် ပုံကြမ်းကို အောက်ခြေ Scrollbar ဖြင့် အလျားလိုက် ဘယ်/ညာ ရွှေ့ကြည့်ရှုနိုင်ပါသည် (Horizontal Scroll)",

      section4Title: "၄။ ပစ္စည်းတန်ဖိုးနှင့် ကုန်ကျစရိတ် စာရင်း (Quotation / BOQ)",
      section4Desc: "ပစ္စည်းတစ်ခုချင်းစီ၏ ဈေးနှုန်းကို ပြင်ဆင်နိုင်ပြီး စုစုပေါင်း ကုန်ကျစရိတ်ကို တိုက်ရိုက်တွက်ချက်နိုင်ပါသည်",
      resetPrices: "ဈေးနှုန်း မူလအတိုင်းထားမည်",
      customerName: "ဝယ်ယူသူ / Customer အမည်:",
      projectName: "ပရောဂျက် / တည်နေရာ အမည်:",
      quotationDate: "ရက်စွဲ:",
      tableItemName: "ပစ္စည်းအမည်",
      tableSpecs: "သတ်မှတ်ချက် (SPECS)",
      tableQty: "အရေအတွက်",
      tablePrice: "တစ်ခုနှုန်း (ကျပ်)",
      tableTotal: "စုစုပေါင်း (ကျပ်)",
      subtotalPrice: "ပစ္စည်း စုစုပေါင်း တန်ဖိုး:",
      discountLabel: "လျှော့ဈေး (%):",
      grandTotal: "ကျသင့်ငွေ စုစုပေါင်း:",
      copyBoq: "BOQ စာရင်း ကော်ပီကူးမည်",
      exportCsv: "Excel ဖိုင် (CSV) ထုတ်မည်",
      printA4: "Print / PDF (A4) ထုတ်မည်",

      walkwayDirectionLabel: "လျှောက်လမ်း ဦးတည်ချက် (WALKWAY DIRECTION)",
      walkwayDirectionHint: "အတန်းကြား / ကော်လံကြား မိမိကြိုက်နှစ်သက်ရာ နေရာများတွင် ထည့်နိုင်ပါသည်",
      walkwayBetweenCols: "Col {c1} နှင့် Col {c2} ကြား",
      orientationSectionTitle: "ဆိုလာပြား ဦးတည်ချက် (PANEL ORIENTATION) - Portrait & Landscape",
      orientationSectionDesc: "ဆိုလာပြားများကို ဒေါင်လိုက် (Portrait) နှင့် အလျားလိုက် (Landscape) မိမိစိတ်ကြိုက် အကွက်လိုက် သို့မဟုတ် ပုံကြမ်းပေါ်တွင် လှည့်နိုင်ပါသည်",
      rowsUnitLabel: "တန်း",
      colsUnitLabel: "ကော်လံ",
      railLengthDropdown: "GI RAIL တစ်ချောင်း၏ အရှည် (မီတာ)",
      railStandardNote: "မြန်မာပြည်တွင် အသုံးအများဆုံး စံအရှည်:",
      customerPlaceholder: "ဥပမာ - ဦးမောင်မောင် (ရန်ကုန်)",
      projectPlaceholder: "ဥပမာ - 5kW Residential On-Grid Roof",
      copyQuotationBtn: "Quotation စာသား ကူးယူမည် (Viber / Telegram)",
      printQuotationBtn: "Quotation ပရင့်ထုတ်မည် / PDF သိမ်းမည်",
      downloadCsvBtn: "CSV ဒေါင်းလုဒ်လုပ်မည်",

      section5Title: "၅။ ဆိုလာတပ်ဆင်ရာတွင် သတိပြုရန် အချက်များနှင့် နည်းပညာ အကြံပြုချက်များ",
      section5Desc: "ဆိုလာအင်ဂျင်နီယာနှင့် တပ်ဆင်ရေး ကျွမ်းကျင်သူများ လိုက်နာရမည့် စံချိန်စံညွှန်းများ",
      torqueTitle: "ဝက်အူ တင်းအား (Bolt Torque Setting)",
      torqueDesc: "M8 Allen Bolt များကို 12-14 N·m ထက် မကျော်လွန်စေဘဲ ညီညာစွာ ကျပ်ပေးပါ။ အရမ်းကျပ်လွန်းပါက ဆိုလာပြား Frame နှင့် မှန်သား ပျက်စီးနိုင်ပါသည်။",
      overhangTitle: "Rail အစွန်းထွက် အကွာအဝေး (Overhang Limit)",
      overhangDesc: "နောက်ဆုံး L-Feet သို့မဟုတ် Hook မှ Rail အစွန်းထွက် အကွာအဝေးသည် 400mm (0.4m) ထက် မကျော်သင့်ပါ။",
      thermalTitle: "အပူချိန်ကြောင့် ကျုံ့/ဆန့်မှု (Thermal Expansion)",
      thermalDesc: "Rail အရှည် ၁၅ မီတာထက် ကျော်လွန်သော တန်းများတွင် အပူချိန်ကြောင့် ကွေးကောက်ခြင်းမဖြစ်စေရန် 20-30mm ချဲ့ထွင်ခွင့် အပေါက်ထားပေးသင့်ပါသည်။",
      groundingTitle: "မိုးကြိုးလွှဲနှင့် မြေစိုက်စနစ် (Grounding)",
      groundingBestPracticeDesc: "ဆိုလာပြားဘောင်များအားလုံးကို Bonding Washer / Clip များဖြင့် စနစ်တကျ မြေစိုက်ကြိုး ဆက်သွယ်ပေးရပါမည်။",

      modalTitle: "ဆိုလာပြား ဒေတာဘေ့စ် (SOLAR PANEL DATABASE)",
      modalSub: "စံချိန်စံညွှန်းပြားများနှင့် မိမိစိတ်ကြိုက် အတိုင်းအတာ (Length × Width × Thickness) များ ထည့်သွင်းစီမံရန်",
      searchPlaceholder: "ဆိုလာပြား ရှာဖွေရန် (Brand, Model, Watts)...",
      addNewPanel: "ဆိုလာပြားအသစ် ထည့်မည်"
    };
  }, [lang]);

  // Exact Physical Aspect Ratio calculation (Length / Width)
  const panelAspectRatio = useMemo(() => {
    if (panelWidth > 0 && panelLength > 0) {
      return panelLength / panelWidth;
    }
    return 2.0; // fallback standard 2:1
  }, [panelLength, panelWidth]);

  // Dynamic schematic dimensions based on true physical ratio and scale mode
  const scaleParams = useMemo(() => {
    // shortDim in pixels:
    // compact: 36px (small, elegant blueprint schematic - fits neatly on screen)
    // medium: 52px
    // large: 72px
    let shortDim = 36;
    if (diagramScaleMode === 'medium') shortDim = 52;
    if (diagramScaleMode === 'large') shortDim = 72;

    const longDim = Math.max(shortDim + 8, Math.round(shortDim * panelAspectRatio));

    // Walkway width in pixels, strictly proportional to physical dimension (walkwayWidthM / panelWidth)
    const walkwayColPx = Math.max(18, Math.round(shortDim * (walkwayWidthM / (panelWidth || 1.134))));
    const walkwayRowPx = Math.max(18, Math.round(shortDim * (walkwayWidthM / (panelWidth || 1.134))));

    return {
      shortDim,
      longDim,
      portraitW: shortDim,
      portraitH: longDim,
      landscapeW: longDim,
      landscapeH: shortDim,
      walkwayColPx,
      walkwayRowPx
    };
  }, [diagramScaleMode, panelAspectRatio, walkwayWidthM, panelWidth]);

  // Merged Solar Panel Database (Default Presets + User Custom Database + Admin Mounting Database from Cloud)
  const allDatabasePanels: PanelPreset[] = useMemo(() => {
    const list: PanelPreset[] = [];
    const seen = new Set<string>();
    const seenSignatures = new Set<string>();

    const addPanel = (p: PanelPreset) => {
      if (!p) return;
      const id = p.id;
      const sig = `${p.name || ''}_${p.watt || 0}`.toLowerCase().trim();
      if ((id && seen.has(id)) || (sig && seenSignatures.has(sig))) {
        return;
      }
      if (id) seen.add(id);
      if (sig) seenSignatures.add(sig);
      list.push(p);
    };

    // 1. Admin Mounting Database panels (Live published from Excel/CSV)
    if (mountingDatabase?.panels && mountingDatabase.panels.length > 0) {
      mountingDatabase.panels.forEach(p => {
        const id = p.id || `panel_${p.brand}_${p.watt}`;
        addPanel({
          id,
          name: `${p.brand} ${p.model} (${p.watt}W)`,
          watt: p.watt,
          voc: p.voc || 49.5,
          vmp: p.vmp || 41.5,
          imp: p.imp || 13.2,
          isc: p.isc || 14.0,
          width: Number((p.widthMm / 1000).toFixed(3)),
          length: Number((p.lengthMm / 1000).toFixed(3)),
          thickness: p.thicknessMm || 30
        });
      });
    }

    // 2. User custom saved panels from cloud
    if (customPanels && customPanels.length > 0) {
      customPanels.forEach(p => {
        addPanel(p);
      });
    }

    // 3. Default presets
    DEFAULT_PANEL_PRESETS.forEach(p => {
      addPanel(p);
    });

    return list;
  }, [customPanels, mountingDatabase?.panels]);

  // Select a panel from Database
  const handleSelectDatabasePanel = (panel: PanelPreset) => {
    setSelectedPresetId(panel.id);
    setPanelWatt(panel.watt);
    setPanelWidth(panel.width ?? 1.134);
    setPanelLength(panel.length ?? 2.278);
    setPanelThickness(panel.thickness ?? 30);
    if (panel.voc) setPanelVoc(panel.voc);
    if (panel.vmp) setPanelVmp(panel.vmp);
    setShowPanelDbModal(false);
    if (onShowToast) {
      onShowToast({
        text: `${panel.name} (${panel.watt}W, ${(panel.length ?? 2.278) * 1000}mm × ${(panel.width ?? 1.134) * 1000}mm) ကို ရွေးချယ်ပြီးပါပြီ`,
        type: 'success'
      });
    }
  };

  // Save new custom panel into database
  const handleSavePanelToDatabase = async () => {
    if (!newPanelForm.name.trim()) {
      if (onShowToast) {
        onShowToast({ text: 'ကျေးဇူးပြု၍ ဆိုလာပြား အမည် ထည့်သွင်းပေးပါ', type: 'error' });
      }
      return;
    }
    const newPanel: PanelPreset = {
      id: `custom_panel_${Date.now()}`,
      name: newPanelForm.name.trim(),
      watt: Number(newPanelForm.watt) || 550,
      length: Number((newPanelForm.lengthMm / 1000).toFixed(3)),
      width: Number((newPanelForm.widthMm / 1000).toFixed(3)),
      thickness: Number(newPanelForm.thickness) || 30,
      voc: Number(newPanelForm.voc) || 49.9,
      vmp: Number(newPanelForm.vmp) || 41.9,
      imp: Number(((newPanelForm.watt / (newPanelForm.vmp || 41.9))).toFixed(2)),
      isc: Number(((newPanelForm.watt / (newPanelForm.vmp || 41.9)) * 1.07).toFixed(2))
    };

    const updatedList = [newPanel, ...(customPanels || [])];
    if (onUpdateCustomPanels) {
      await onUpdateCustomPanels(updatedList);
    }
    handleSelectDatabasePanel(newPanel);
    setShowAddPanelForm(false);
    setShowPanelDbModal(false);
    if (onShowToast) {
      onShowToast({
        text: `ဒေတာဘေ့စ်တွင် "${newPanel.name}" (${newPanel.watt}W, ${newPanelForm.lengthMm}mm × ${newPanelForm.widthMm}mm) ကို သိမ်းဆည်းပြီးပါပြီ!`,
        type: 'success'
      });
    }
  };

  // Quick save current dimensions to database
  const handleQuickSaveCurrentDimensions = () => {
    setNewPanelForm({
      name: `Custom ${panelWatt}W (${Math.round(panelLength * 1000)}×${Math.round(panelWidth * 1000)}mm)`,
      watt: panelWatt,
      lengthMm: Math.round(panelLength * 1000),
      widthMm: Math.round(panelWidth * 1000),
      thickness: panelThickness,
      voc: panelVoc,
      vmp: panelVmp
    });
    setShowAddPanelForm(true);
    setShowPanelDbModal(true);
  };

  // Delete custom panel from database
  const handleDeleteCustomPanel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customPanels) return;
    const updatedList = customPanels.filter(p => p.id !== id);
    if (onUpdateCustomPanels) {
      await onUpdateCustomPanels(updatedList);
    }
    if (selectedPresetId === id) {
      if (updatedList.length > 0) {
        handleSelectDatabasePanel(updatedList[0]);
      } else {
        handleSelectDatabasePanel(DEFAULT_PANEL_PRESETS[0]);
      }
    }
    if (onShowToast) {
      onShowToast({ text: 'ဆိုလာပြားကို ဒေတာဘေ့စ်မှ ပယ်ဖျက်ပြီးပါပြီ', type: 'info' });
    }
  };

  // 2D Matrix Dimension Resize Handler
  const handleUpdateMatrixDimensions = (newRows: number, newCols: number) => {
    const rCount = Math.max(1, Math.min(10, newRows));
    const cCount = Math.max(2, Math.min(20, newCols));
    setMatrixRows(rCount);
    setMatrixCols(cCount);
    
    // Clean up walkway indices that exceed new dimensions
    setWalkwayRows(prev => prev.filter(r => r < rCount));
    setWalkwayCols(prev => prev.filter(c => c < cCount));

    setMatrixGrid(prev => {
      const next: boolean[][] = [];
      for (let r = 0; r < rCount; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < cCount; c++) {
          if (prev[r] && prev[r][c] !== undefined) {
            row.push(prev[r][c]);
          } else {
            row.push(true);
          }
        }
        next.push(row);
      }
      return next;
    });

    setMatrixOrientation(prev => {
      const next: ('portrait' | 'landscape')[][] = [];
      for (let r = 0; r < rCount; r++) {
        const row: ('portrait' | 'landscape')[] = [];
        for (let c = 0; c < cCount; c++) {
          if (prev[r] && prev[r][c] !== undefined) {
            row.push(prev[r][c]);
          } else {
            row.push(globalOrientation);
          }
        }
        next.push(row);
      }
      return next;
    });
  };

  // Matrix Interactive Cell, Row, Col Handlers
  const handleToggleCell = (rIdx: number, cIdx: number) => {
    setMatrixGrid(prev => {
      const copy = prev.map(row => [...row]);
      copy[rIdx][cIdx] = !copy[rIdx][cIdx];
      return copy;
    });
  };

  const handleToggleRow = (rIdx: number) => {
    setMatrixGrid(prev => {
      const copy = prev.map(row => [...row]);
      const anyActive = copy[rIdx].some(Boolean);
      copy[rIdx] = copy[rIdx].map(() => !anyActive);
      return copy;
    });
  };

  const handleToggleCol = (cIdx: number) => {
    setMatrixGrid(prev => {
      const copy = prev.map(row => [...row]);
      const anyActive = copy.some(row => row[cIdx]);
      copy.forEach(row => {
        row[cIdx] = !anyActive;
      });
      return copy;
    });
  };

  // Orientation Handlers
  const handleToggleOrientation = (rIdx: number, cIdx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMatrixOrientation(prev => {
      const copy = prev.map(row => [...row]);
      copy[rIdx][cIdx] = copy[rIdx][cIdx] === 'portrait' ? 'landscape' : 'portrait';
      return copy;
    });
  };

  const handleSetAllPortrait = () => {
    setGlobalOrientation('portrait');
    setMatrixOrientation(prev => prev.map(row => row.map(() => 'portrait')));
    if (onShowToast) {
      onShowToast({ text: 'ဆိုလာပြားအားလုံးကို ဒေါင်လိုက် (Portrait) သို့ ပြောင်းထားပါသည်', type: 'info' });
    }
  };

  const handleSetAllLandscape = () => {
    setGlobalOrientation('landscape');
    setMatrixOrientation(prev => prev.map(row => row.map(() => 'landscape')));
    if (onShowToast) {
      onShowToast({ text: 'ဆိုလာပြားအားလုံးကို အလျားလိုက် (Landscape) သို့ ပြောင်းထားပါသည်', type: 'info' });
    }
  };

  const handleToggleRowOrientation = (rIdx: number) => {
    setMatrixOrientation(prev => {
      const copy = prev.map(row => [...row]);
      const anyPortrait = copy[rIdx].some(o => o === 'portrait');
      copy[rIdx] = copy[rIdx].map(() => anyPortrait ? 'landscape' : 'portrait');
      return copy;
    });
  };

  // Walkway Divider Toggle Handlers
  const handleToggleWalkwayRow = (rowDiv: number) => {
    setWalkwayRows(prev => {
      if (prev.includes(rowDiv)) {
        return prev.filter(r => r !== rowDiv);
      } else {
        return [...prev, rowDiv].sort((a, b) => a - b);
      }
    });
  };

  const handleToggleWalkwayCol = (colDiv: number) => {
    setWalkwayCols(prev => {
      if (prev.includes(colDiv)) {
        return prev.filter(c => c !== colDiv);
      } else {
        return [...prev, colDiv].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectAll = () => {
    setMatrixGrid(prev => prev.map(row => row.map(() => true)));
  };

  const handleClearAll = () => {
    setMatrixGrid(prev => prev.map(row => row.map(() => false)));
  };

  const handleInvertSelection = () => {
    setMatrixGrid(prev => prev.map(row => row.map(cell => !cell)));
  };

  const handlePreset = (rows: number, cols: number) => {
    const rCount = Math.max(1, Math.min(10, rows));
    const cCount = Math.max(2, Math.min(20, cols));
    setMatrixRows(rCount);
    setMatrixCols(cCount);
    setWalkwayRows(prev => prev.filter(r => r < rCount));
    setWalkwayCols(prev => prev.filter(c => c < cCount));
    const nextGrid: boolean[][] = [];
    const nextOrient: ('portrait' | 'landscape')[][] = [];
    for (let r = 0; r < rCount; r++) {
      const row: boolean[] = [];
      const oRow: ('portrait' | 'landscape')[] = [];
      for (let c = 0; c < cCount; c++) {
        row.push(true);
        oRow.push(globalOrientation);
      }
      nextGrid.push(row);
      nextOrient.push(oRow);
    }
    setMatrixGrid(nextGrid);
    setMatrixOrientation(nextOrient);
  };

  // Reset to default
  const handleResetToDefault = () => {
    setMatrixRows(2);
    setMatrixCols(6);
    setMatrixGrid([
      [true, true, true, true, false, false],
      [true, true, true, true, false, false]
    ]);
    setGlobalOrientation('portrait');
    setMatrixOrientation([
      ['portrait', 'portrait', 'portrait', 'portrait', 'portrait', 'portrait'],
      ['portrait', 'portrait', 'portrait', 'portrait', 'portrait', 'portrait']
    ]);
    setDiagramInteractionMode('toggle_cell');
    setHasWalkway(false);
    setWalkwayType('rows');
    setWalkwayRows([1]);
    setWalkwayCols([3]);
    setWalkwayWidthM(0.60);
    setIncludeWalkwayBoq(true);
    setSelectedPresetId('panel_jinko_585_tiger_neo');
    setPanelWatt(585);
    setPanelWidth(1.134);
    setPanelLength(2.278);
    setPanelThickness(30);
    setPanelVoc(51.9);
    setPanelVmp(43.8);
    setRailLength(4.20);
    setRoofMountType('l_feet');
    setIncludeGrounding(true);
    setIncludeCableClips(true);
    setIncludeSpareMargin(false);
    setCustomerName('');
    setProjectName('');
    setDiscountPercent(0);
    setCustomPrices({ ...DEFAULT_PRICES });
    setZoomLevel(100);
    if (onShowToast) {
      onShowToast({
        text: lang === 'my' ? 'မူလသတ်မှတ်ချက်များသို့ ပြန်လည်ထားရှိပြီးပါပြီ' : 'Reset all parameters to standard defaults',
        type: 'info'
      });
    }
  };

  // Reset Prices
  const handleResetPrices = () => {
    setCustomPrices({ ...DEFAULT_PRICES });
    if (onShowToast) {
      onShowToast({
        text: lang === 'my' ? 'ဈေးနှုန်းများကို မူလအတိုင်း ပြန်ထားပြီးပါပြီ' : 'Unit prices restored to standard default rates',
        type: 'info'
      });
    }
  };

  // ----------------------------------------------------
  // CALCULATIONS ENGINE (2D MATRIX, FLEXIBLE WALKWAYS & MIXED ORIENTATION)
  // ----------------------------------------------------

  // Total panels count
  const totalPanels = useMemo(() => {
    return matrixGrid.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  }, [matrixGrid]);

  // Active rows list (rows with at least one active panel)
  const effectiveRows: number[] = useMemo(() => {
    const list: number[] = [];
    matrixGrid.forEach(row => {
      const activeCount = row.filter(Boolean).length;
      if (activeCount > 0) list.push(activeCount);
    });
    return list.length > 0 ? list : [0];
  }, [matrixGrid]);

  const activeRowsCount = useMemo(() => {
    return matrixGrid.filter(row => row.some(Boolean)).length;
  }, [matrixGrid]);

  // System total capacity in kWp
  const totalKwp = useMemo(() => {
    return (totalPanels * panelWatt) / 1000;
  }, [totalPanels, panelWatt]);

  // System total area
  const totalAreaM2 = useMemo(() => {
    return totalPanels * panelWidth * panelLength;
  }, [totalPanels, panelWidth, panelLength]);

  const totalAreaSqft = useMemo(() => {
    return totalAreaM2 * 10.7639;
  }, [totalAreaM2]);

  // Active Walkway Dividers
  const activeWalkwayRows = useMemo(() => {
    if (!hasWalkway || (walkwayType !== 'rows' && walkwayType !== 'both')) return [];
    return walkwayRows.filter(r => r >= 1 && r < matrixRows).sort((a, b) => a - b);
  }, [hasWalkway, walkwayType, walkwayRows, matrixRows]);

  const activeWalkwayCols = useMemo(() => {
    if (!hasWalkway || (walkwayType !== 'cols' && walkwayType !== 'both')) return [];
    return walkwayCols.filter(c => c >= 1 && c < matrixCols).sort((a, b) => a - b);
  }, [hasWalkway, walkwayType, walkwayCols, matrixCols]);

  // Column blocks partitioning based on activeWalkwayCols
  // e.g. if activeWalkwayCols = [2, 5] with 8 columns:
  // blocks are [0, 2], [2, 5], [5, 8]
  const columnBlocks = useMemo(() => {
    const blocks: { startCol: number; endCol: number }[] = [];
    let start = 0;
    activeWalkwayCols.forEach(colDiv => {
      blocks.push({ startCol: start, endCol: colDiv });
      start = colDiv;
    });
    blocks.push({ startCol: start, endCol: matrixCols });
    return blocks;
  }, [activeWalkwayCols, matrixCols]);

  // Physical Array Dimensions (Width & Length) with Walkways & Orientation
  const rowMetrics = useMemo(() => {
    const midClampGapM = 0.02; // 20mm
    const endMarginM = 0.04;   // 20mm each end

    return matrixGrid.map((row, rIdx) => {
      let rowActivePanels = 0;
      let maxPanelLengthInRow = 0;
      const blockWidths: number[] = [];

      columnBlocks.forEach(block => {
        let blockCount = 0;
        let blockPanelsWidth = 0;

        for (let c = block.startCol; c < block.endCol; c++) {
          if (row[c]) {
            blockCount++;
            rowActivePanels++;
            const isLandscape = matrixOrientation[rIdx]?.[c] === 'landscape';
            const cellW = isLandscape ? panelLength : panelWidth;
            const cellL = isLandscape ? panelWidth : panelLength;
            blockPanelsWidth += cellW;
            if (cellL > maxPanelLengthInRow) maxPanelLengthInRow = cellL;
          }
        }

        if (blockCount > 0) {
          const bWidth = blockPanelsWidth + ((blockCount - 1) * midClampGapM) + endMarginM;
          blockWidths.push(bWidth);
        }
      });

      // Row width is sum of all active blocks in this row + walkway width for gaps between active blocks
      const rowWidth = blockWidths.length > 0
        ? blockWidths.reduce((a, b) => a + b, 0) + ((blockWidths.length - 1) * walkwayWidthM)
        : 0;

      return {
        rowActivePanels,
        rowWidth,
        rowHeight: maxPanelLengthInRow > 0 ? maxPanelLengthInRow : panelLength,
        blockWidths
      };
    });
  }, [matrixGrid, columnBlocks, matrixOrientation, panelLength, panelWidth, walkwayWidthM]);

  // Max width of any row in the array
  const totalRowWidthM = useMemo(() => {
    if (totalPanels <= 0) return 0;
    const widths = rowMetrics.map(r => r.rowWidth);
    return Math.max(...widths, 0);
  }, [totalPanels, rowMetrics]);

  const totalRowWidthFt = useMemo(() => {
    return totalRowWidthM * 3.28084;
  }, [totalRowWidthM]);

  // Total Array Length in meters (sum of active row heights + row gaps + horizontal walkways)
  const totalArrayLengthM = useMemo(() => {
    if (totalPanels <= 0) return 0;
    const rowGapM = 0.05; // 50mm

    let totalLength = 0;
    let activeRowsFound = 0;

    rowMetrics.forEach(r => {
      if (r.rowActivePanels > 0) {
        totalLength += r.rowHeight;
        activeRowsFound++;
      }
    });

    if (activeRowsFound > 1) {
      totalLength += (activeRowsFound - 1) * rowGapM;
    }

    // Add horizontal walkways that actually separate active rows
    activeWalkwayRows.forEach(rowDiv => {
      const hasAbove = matrixGrid.slice(0, rowDiv).some(row => row.some(Boolean));
      const hasBelow = matrixGrid.slice(rowDiv).some(row => row.some(Boolean));
      if (hasAbove && hasBelow) {
        totalLength += walkwayWidthM;
      }
    });

    return totalLength;
  }, [totalPanels, rowMetrics, activeWalkwayRows, matrixGrid, walkwayWidthM]);

  const totalArrayLengthFt = useMemo(() => {
    return totalArrayLengthM * 3.28084;
  }, [totalArrayLengthM]);

  // Hardware Quantities Calculation (accounting for Matrix blocks, Walkways, and Landscape Orientations)
  const hardware = useMemo(() => {
    let rawEndClamps = 0;
    let rawMidClamps = 0;
    let rawRailBars = 0;
    let rawSplices = 0;
    let rawBrackets = 0;
    let totalRailLengthM = 0;

    matrixGrid.forEach((row, rIdx) => {
      if (!row.some(Boolean)) return;

      columnBlocks.forEach(block => {
        let blockCount = 0;
        let blockPanelsWidth = 0;

        for (let c = block.startCol; c < block.endCol; c++) {
          if (row[c]) {
            blockCount++;
            const isLandscape = matrixOrientation[rIdx]?.[c] === 'landscape';
            const cellW = isLandscape ? panelLength : panelWidth;
            blockPanelsWidth += cellW;
          }
        }

        if (blockCount <= 0) return;

        // 4 end clamps per block (2 rails x 2 ends)
        rawEndClamps += 4;
        if (blockCount > 1) {
          rawMidClamps += (blockCount - 1) * 2;
        }

        const bWidth = blockPanelsWidth + ((blockCount - 1) * 0.02) + 0.04;
        const barsPerLine = Math.ceil(bWidth / railLength);
        const blockBars = barsPerLine * 2;
        rawRailBars += blockBars;
        if (barsPerLine > 1) {
          rawSplices += (barsPerLine - 1) * 2;
        }
        const bracketsPerLine = Math.ceil(bWidth / 1.2) + 1;
        rawBrackets += bracketsPerLine * 2;
        totalRailLengthM += blockBars * railLength;
      });
    });

    // Walkway metrics
    let walkwayLengthM = 0;
    if (hasWalkway) {
      // Horizontal walkways
      let activeHCount = 0;
      activeWalkwayRows.forEach(rowDiv => {
        const hasAbove = matrixGrid.slice(0, rowDiv).some(row => row.some(Boolean));
        const hasBelow = matrixGrid.slice(rowDiv).some(row => row.some(Boolean));
        if (hasAbove && hasBelow) activeHCount++;
      });

      // Vertical walkways
      let activeVCount = 0;
      activeWalkwayCols.forEach(colDiv => {
        const hasLeft = matrixGrid.some(row => row.slice(0, colDiv).some(Boolean));
        const hasRight = matrixGrid.some(row => row.slice(colDiv).some(Boolean));
        if (hasLeft && hasRight) activeVCount++;
      });

      if (walkwayType === 'rows' || walkwayType === 'both') {
        walkwayLengthM += activeHCount * totalRowWidthM;
      }
      if (walkwayType === 'cols' || walkwayType === 'both') {
        walkwayLengthM += activeVCount * totalArrayLengthM;
      }
    }

    const walkwayBrackets = hasWalkway && includeWalkwayBoq ? Math.ceil(walkwayLengthM / 1.0) + (walkwayType === 'both' ? 2 : 1) : 0;

    // Accessories
    const rawGroundingLugs = includeGrounding ? (activeRowsCount > 0 ? Math.max(2, Math.ceil(totalPanels / 12) * 2) : 0) : 0;
    const rawBondingClips = includeGrounding ? rawMidClamps : 0;
    const rawCableClips = includeCableClips ? totalPanels * 2 : 0;

    let rawBeams = 0;
    matrixGrid.forEach((row, rIdx) => {
      row.forEach((isActive, cIdx) => {
        if (isActive) {
          const isL = matrixOrientation[rIdx]?.[cIdx] === 'landscape';
          rawBeams += isL ? 3 : 2;
        }
      });
    });

    // Apply 5% spare margin if enabled
    const marginMultiplier = includeSpareMargin ? 1.05 : 1.0;
    const endClamps = Math.ceil(rawEndClamps * (includeSpareMargin ? 1.1 : 1.0));
    const midClamps = Math.ceil(rawMidClamps * marginMultiplier);
    const railBars = rawRailBars;
    const splices = Math.ceil(rawSplices * marginMultiplier);
    const brackets = Math.ceil(rawBrackets * marginMultiplier);
    const substructureBeams = Math.ceil(rawBeams * marginMultiplier);
    const groundingLugs = rawGroundingLugs;
    const bondingClips = Math.ceil(rawBondingClips * marginMultiplier);
    const cableClips = Math.ceil(rawCableClips * marginMultiplier);

    const weightKg = (totalRailLengthM * 0.95) +
      ((endClamps + midClamps) * 0.12) +
      (brackets * 0.28) +
      (splices * 0.25) +
      ((groundingLugs + bondingClips + cableClips) * 0.05) +
      (hasWalkway && includeWalkwayBoq ? (walkwayLengthM * 3.8) + (walkwayBrackets * 0.45) : 0);

    return {
      endClamps,
      midClamps,
      railBars,
      splices,
      brackets,
      substructureBeams,
      groundingLugs,
      bondingClips,
      cableClips,
      totalRailLengthM,
      walkwayLengthM: Math.round(walkwayLengthM * 10) / 10,
      walkwayBrackets,
      weightKg: Math.round(weightKg * 10) / 10
    };
  }, [
    matrixGrid,
    columnBlocks,
    matrixOrientation,
    panelLength,
    panelWidth,
    railLength,
    hasWalkway,
    walkwayType,
    activeWalkwayRows,
    activeWalkwayCols,
    totalRowWidthM,
    totalArrayLengthM,
    includeWalkwayBoq,
    includeGrounding,
    includeCableClips,
    includeSpareMargin,
    totalPanels,
    activeRowsCount
  ]);

  // Selected Roof Mount Item Details
  const selectedRoofMount = useMemo(() => {
    return ROOF_MOUNT_TYPES.find(t => t.id === roofMountType) || ROOF_MOUNT_TYPES[0];
  }, [roofMountType]);

  // BOQ Item List
  const boqItems: MountingBOQItem[] = useMemo(() => {
    const items: MountingBOQItem[] = [];

    // 1. GI / Solar Rail
    if (hardware.railBars > 0) {
      const price = customPrices.rail ?? DEFAULT_PRICES.rail;
      items.push({
        id: 'rail',
        nameMy: `GI / အလူမီနီယမ် Rail ရထားလမ်း (${railLength.toFixed(1)} မီတာ)`,
        nameEn: `Solar Aluminum / GI Rail (${railLength.toFixed(1)}m)`,
        nameZh: `光伏铝合金/镀锌导轨 (${railLength.toFixed(1)}米)`,
        descriptionMy: `အကြမ်းခံ ဆိုလာသီးသန့် Rail ချောင်း၊ အလျား ${railLength.toFixed(1)} မီတာ၊ စုစုပေါင်း Rail အလျား ${hardware.totalRailLengthM.toFixed(1)} မီတာ`,
        descriptionEn: `Heavy-duty solar mounting rail bar, ${railLength.toFixed(1)}m length, total rail length ${hardware.totalRailLengthM.toFixed(1)}m`,
        descriptionZh: `高强度光伏专用导轨，单根长 ${railLength.toFixed(1)} 米，总导轨长度 ${hardware.totalRailLengthM.toFixed(1)} 米`,
        specs: `L=${railLength.toFixed(1)}m, AL6005-T5 / GI`,
        quantity: hardware.railBars,
        unitMy: 'ချောင်း',
        unitEn: 'Bars',
        unitZh: '根',
        unitPrice: price,
        totalPrice: hardware.railBars * price,
        category: 'rail'
      });
    }

    // 2. End Clamp
    if (hardware.endClamps > 0) {
      const price = customPrices.end_clamp ?? DEFAULT_PRICES.end_clamp;
      items.push({
        id: 'end_clamp',
        nameMy: `End Clamp အစွန်းထိန်းကလစ် (${panelThickness} mm)`,
        nameEn: `End Clamp Kit (${panelThickness}mm)`,
        nameZh: `边压块组件 (${panelThickness}mm)`,
        descriptionMy: `M8 Allen Bolt၊ စပရင်ဝါရှာနှင့် Rail T-Nut ပါဝင်ပြီး ဆိုလာပြားအထူ ${panelThickness}mm အတွက် (အတန်း ${effectiveRows.length} တန်း × ၄ ခု)`,
        descriptionEn: `Includes M8 Allen bolt, spring washer & rail T-nut for ${panelThickness}mm panel frame (${effectiveRows.length} rows × 4)`,
        descriptionZh: `含 M8 内六角螺栓、弹簧垫圈及导轨T型螺母，适配 ${panelThickness}mm 边框 (${effectiveRows.length} 排 × 4 套)`,
        specs: `H=${panelThickness}mm, M8 SUS304`,
        quantity: hardware.endClamps,
        unitMy: 'စုံ',
        unitEn: 'Pairs',
        unitZh: '套',
        unitPrice: price,
        totalPrice: hardware.endClamps * price,
        category: 'clamp'
      });
    }

    // 3. Mid Clamp
    if (hardware.midClamps > 0) {
      const price = customPrices.mid_clamp ?? DEFAULT_PRICES.mid_clamp;
      items.push({
        id: 'mid_clamp',
        nameMy: `Mid Clamp အလယ်ထိန်းကလစ် (${panelThickness} mm)`,
        nameEn: `Mid Clamp Kit (${panelThickness}mm)`,
        nameZh: `中压块组件 (${panelThickness}mm)`,
        descriptionMy: `ဆိုလာပြား ၂ ချပ်ကြား ညှပ်တွဲရန် M8 Bolt နှင့် T-Nut ပါဝင်သော အလူမီနီယမ်ကလစ်`,
        descriptionEn: `Fastens adjacent solar panels together, with M8 bolt and rail T-nut`,
        descriptionZh: `固定相邻光伏组件，配备 M8 螺栓与导轨专用T型螺母`,
        specs: `H=${panelThickness}mm, M8 SUS304`,
        quantity: hardware.midClamps,
        unitMy: 'စုံ',
        unitEn: 'Pairs',
        unitZh: '套',
        unitPrice: price,
        totalPrice: hardware.midClamps * price,
        category: 'clamp'
      });
    }

    // 4. Rail Splice
    if (hardware.splices > 0) {
      const price = customPrices.splice ?? DEFAULT_PRICES.splice;
      items.push({
        id: 'splice',
        nameMy: `Rail Splice ရထားလမ်းဆက်ခွင် (အဆက်ကလစ်)`,
        nameEn: `Rail Splice Joiner Kit (200mm)`,
        nameZh: `导轨连接件连接条 (200mm)`,
        descriptionMy: `Rail နှစ်ခုကြား အလျားဆက်ရန် ၂၀၀ မီလီမီတာ အဆက်ပြားနှင့် စက်အူများ`,
        descriptionEn: `200mm aluminum splice bar and fasteners to join rail segments securely`,
        descriptionZh: `200mm 铝合金连接条及紧固螺栓，牢固延长对接导轨`,
        specs: `200mm AL6005-T5 / GI with fasteners`,
        quantity: hardware.splices,
        unitMy: 'စုံ',
        unitEn: 'Sets',
        unitZh: '套',
        unitPrice: price,
        totalPrice: hardware.splices * price,
        category: 'splice'
      });
    }

    // 5. Roof Mount Bracket (L-Feet / Hook / Tripod Frame)
    if (hardware.brackets > 0) {
      const price = customPrices.roof_bracket ?? (selectedRoofMount.defaultPrice || DEFAULT_PRICES.roof_bracket);
      const isTripod = selectedRoofMount.id === 'tripod';
      const bracketQty = isTripod ? Math.max(2, Math.round(hardware.brackets / 2)) : hardware.brackets;
      items.push({
        id: 'roof_bracket',
        nameMy: selectedRoofMount.nameMy,
        nameEn: selectedRoofMount.nameEn,
        nameZh: selectedRoofMount.nameZh || selectedRoofMount.nameEn,
        descriptionMy: selectedRoofMount.descMy,
        descriptionEn: selectedRoofMount.descEn || selectedRoofMount.nameEn,
        descriptionZh: selectedRoofMount.descZh || selectedRoofMount.nameZh || selectedRoofMount.nameEn,
        specs: selectedRoofMount.spec,
        quantity: bracketQty,
        unitMy: isTripod ? 'စင်' : 'စုံ',
        unitEn: isTripod ? 'Frames' : 'Sets',
        unitZh: '套',
        unitPrice: price,
        totalPrice: bracketQty * price,
        category: 'bracket'
      });
    }

    // 5B. Sub-Structure Steel Frame Beams (သံ ဖရိန် ပင်မ Beam များ)
    if (showSubstructureBeams && hardware.substructureBeams > 0) {
      const price = customPrices.substructure_beam ?? DEFAULT_PRICES.substructure_beam;
      items.push({
        id: 'substructure_beam',
        nameMy: `သံ ဖရိန် ပင်မ Beam / Rafter (C-Steel Support Beams)`,
        nameEn: `C-Steel Sub-structure Support Frame Beams`,
        nameZh: `C型钢主支撑支架梁 (Substructure Frame Beams)`,
        descriptionMy: `ဆိုလာပြားများကို အောက်ခံ ခိုင်ခံ့စွာ ထိန်းပေးသော C-Steel ပင်မ သံဖရိန် Beam တန်းများ (စုစုပေါင်း ${hardware.substructureBeams} ချောင်း)`,
        descriptionEn: `Heavy-duty C-Steel structural support beams underneath solar panels (${hardware.substructureBeams} bars)`,
        descriptionZh: `组件底部主承重C型钢檩条与支架梁 (共 ${hardware.substructureBeams} 根)`,
        specs: `C-Steel HDG 41×41 / 75×38mm`,
        quantity: hardware.substructureBeams,
        unitMy: 'ချောင်း',
        unitEn: 'Bars',
        unitZh: '根',
        unitPrice: price,
        totalPrice: hardware.substructureBeams * price,
        category: 'bracket'
      });
    }

    // 6. Grounding Lugs
    if (includeGrounding && hardware.groundingLugs > 0) {
      const price = customPrices.grounding_lug ?? DEFAULT_PRICES.grounding_lug;
      items.push({
        id: 'grounding_lug',
        nameMy: `မြေစိုက်ကြိုး ဆက်သွယ်ခွင် (Grounding Lug)`,
        nameEn: `Grounding Lug with M8 Bolt`,
        nameZh: `接地线夹接线端子 (Grounding Lug)`,
        descriptionMy: `မိုးကြိုးလွှဲ ကြေးနီကြိုးကို Rail နှင့် မြဲမြံစွာ ဆက်သွယ်ပေးရန်`,
        descriptionEn: `Securely connects bare copper earth wire to the aluminum rail structure`,
        descriptionZh: `将避雷接地铜线稳固连接至光伏铝合金导轨架构`,
        specs: `Copper/Tin plated AL, M8 bolt`,
        quantity: hardware.groundingLugs,
        unitMy: 'စုံ',
        unitEn: 'Sets',
        unitZh: '套',
        unitPrice: price,
        totalPrice: hardware.groundingLugs * price,
        category: 'grounding'
      });
    }

    // 7. Bonding Clips
    if (includeGrounding && hardware.bondingClips > 0) {
      const price = customPrices.bonding_clip ?? DEFAULT_PRICES.bonding_clip;
      items.push({
        id: 'bonding_clip',
        nameMy: `ဆိုလာဘောင် အလွှာဖောက် မြေစိုက်ဝါရှာ (Bonding Clip)`,
        nameEn: `Solar Grounding Bonding Clip`,
        nameZh: `防雷接地穿刺垫片 (Bonding Clip)`,
        descriptionMy: `Mid Clamp အောက်ခံတွင် ညှပ်၍ ဆိုလာဘောင် သံချေးကာလွှာကို ဖောက်ကာ Ground ပေးသော ဝါရှာ`,
        descriptionEn: `Piercing stainless steel washer placed under mid clamps to break anodized layer`,
        descriptionZh: `置于中压块下方，刺破阳极氧化绝缘层实现可靠等电位跨接`,
        specs: `SUS304 Piercing Teeth`,
        quantity: hardware.bondingClips,
        unitMy: 'ခု',
        unitEn: 'Pcs',
        unitZh: '片',
        unitPrice: price,
        totalPrice: hardware.bondingClips * price,
        category: 'grounding'
      });
    }

    // 8. Cable Clips
    if (includeCableClips && hardware.cableClips > 0) {
      const price = customPrices.cable_clip ?? DEFAULT_PRICES.cable_clip;
      items.push({
        id: 'cable_clip',
        nameMy: `ဆိုလာ DC ကြိုးထိန်း စတီးကလစ် (Cable Clips)`,
        nameEn: `Solar DC Cable Clips (SUS304)`,
        nameZh: `不锈钢光伏线缆卡扣 (SUS304)`,
        descriptionMy: `ဆိုလာပြားအောက်နှင့် Rail တွင် ညှပ်၍ 4mm²/6mm² DC ကြိုးများကို သပ်ရပ်စေရန်`,
        descriptionEn: `Stainless clips attached to rail to cleanly route 4mm²/6mm² DC solar cables`,
        descriptionZh: `卡扣于导轨或组件边框，整洁固定 4mm²/6mm² 光伏直流电缆`,
        specs: `SUS304, holds 2x 4/6mm² cables`,
        quantity: hardware.cableClips,
        unitMy: 'ခု',
        unitEn: 'Pcs',
        unitZh: '个',
        unitPrice: price,
        totalPrice: hardware.cableClips * price,
        category: 'cable_clip'
      });
    }

    // 9. Anti-Slip Walkway Grating (if Walkway is enabled and included in BOQ)
    if (hasWalkway && includeWalkwayBoq && hardware.walkwayLengthM > 0) {
      const price = customPrices.walkway_grating ?? DEFAULT_PRICES.walkway_grating;
      const meters = Math.ceil(hardware.walkwayLengthM);
      items.push({
        id: 'walkway_grating',
        nameMy: `စလစ်မဖြစ်သော အလူမီနီယမ် / FRP ခေါင်မိုး လျှောက်လမ်းပြား (Walkway Grating)`,
        nameEn: `Anti-Slip Solar Roof Walkway Grating (${(walkwayWidthM * 1000).toFixed(0)}mm Width)`,
        nameZh: `防滑光伏屋面检修走道格栅板 (${(walkwayWidthM * 1000).toFixed(0)}mm 宽)`,
        descriptionMy: `ဆိုလာစနစ် စစ်ဆေးပြုပြင်ထိန်းသိမ်းရေးနှင့် သန့်ရှင်းရေးအတွက် လျှောက်လမ်းပြား (အကျယ် ${(walkwayWidthM * 1000).toFixed(0)}mm၊ စုစုပေါင်းအလျား ${hardware.walkwayLengthM.toFixed(1)} မီတာ)`,
        descriptionEn: `Anti-slip walkway grating for panel maintenance & cleaning (${(walkwayWidthM * 1000).toFixed(0)}mm width, ${hardware.walkwayLengthM.toFixed(1)}m length)`,
        descriptionZh: `用于日常清洗与检修维护的防滑走道格栅 (宽度 ${(walkwayWidthM * 1000).toFixed(0)}mm，总长 ${hardware.walkwayLengthM.toFixed(1)} 米)`,
        specs: `W=${(walkwayWidthM * 1000).toFixed(0)}mm, AL6005-T5 / FRP Non-slip mesh`,
        quantity: meters,
        unitMy: 'မီတာ',
        unitEn: 'Meters',
        unitZh: '米',
        unitPrice: price,
        totalPrice: meters * price,
        category: 'other'
      });
    }

    // 10. Walkway Support Bracket
    if (hasWalkway && includeWalkwayBoq && hardware.walkwayBrackets > 0) {
      const price = customPrices.walkway_bracket ?? DEFAULT_PRICES.walkway_bracket;
      items.push({
        id: 'walkway_bracket',
        nameMy: `Walkway လျှောက်လမ်း အောက်ခံ အထိုင်ခွင် (Walkway Support Bracket Kit)`,
        nameEn: `Walkway Mounting Support Bracket Kit`,
        nameZh: `走道固定安装支架套件`,
        descriptionMy: `လျှောက်လမ်းပြားကို ခေါင်မိုး/ရထားလမ်းပေါ် ခိုင်ခံ့စွာ တွဲဆက်တပ်ဆင်ရန် အထိုင်ခွင်နှင့် ဝက်အူများ`,
        descriptionEn: `Brackets and fasteners to anchor walkway grating securely onto roof/rails`,
        descriptionZh: `将走道格栅牢固固定于屋顶或导轨结构的安装固定支座及紧固件`,
        specs: `SUS304 Bracket with EPDM and fasteners`,
        quantity: hardware.walkwayBrackets,
        unitMy: 'စုံ',
        unitEn: 'Sets',
        unitZh: '套',
        unitPrice: price,
        totalPrice: hardware.walkwayBrackets * price,
        category: 'bracket'
      });
    }

    return items;
  }, [
    hardware, 
    customPrices, 
    railLength, 
    panelThickness, 
    effectiveRows.length, 
    selectedRoofMount, 
    includeGrounding, 
    includeCableClips, 
    hasWalkway, 
    includeWalkwayBoq, 
    walkwayWidthM,
    showSubstructureBeams
  ]);

  // Financial Totals
  const subtotalKs = useMemo(() => {
    return boqItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [boqItems]);

  const discountKs = useMemo(() => {
    return Math.round((subtotalKs * (discountPercent || 0)) / 100);
  }, [subtotalKs, discountPercent]);

  const grandTotalKs = useMemo(() => {
    return Math.max(0, subtotalKs - discountKs);
  }, [subtotalKs, discountKs]);

  // ----------------------------------------------------
  // EXPORT & SHARE ACTIONS
  // ----------------------------------------------------

  // 1. Copy Viber / Telegram Quotation Text
  const handleCopyQuotationText = () => {
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const isEn = lang === 'en';
    const isZh = lang === 'zh';

    let titleHeader = isZh ? `☀️ 光伏支架与配件报价单 / BOQ\n` : isEn ? `☀️ SOLAR MOUNTING HARDWARE QUOTATION / BOQ\n` : `☀️ SOLAR MOUNTING HARDWARE QUOTATION / BOQ\n`;
    let text = titleHeader;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    if (customerName) text += isZh ? `👤 业主/客户: ${customerName}\n` : isEn ? `👤 Customer: ${customerName}\n` : `👤 Customer: ${customerName}\n`;
    if (projectName) text += isZh ? `🏗️ 项目名称: ${projectName}\n` : isEn ? `🏗️ Project: ${projectName}\n` : `🏗️ Project: ${projectName}\n`;
    text += isZh ? `📅 日期: ${dateStr}\n` : `📅 Date: ${dateStr}\n`;
    text += isZh 
      ? `⚡ 阵列规模: ${totalPanels} 块组件 (${totalKwp.toFixed(2)} kWp)\n` 
      : `⚡ Array Size: ${totalPanels} Panels (${totalKwp.toFixed(2)} kWp)\n`;
    text += isZh 
      ? `📐 阵列尺寸: ${totalRowWidthM.toFixed(2)}米 宽 × ${totalArrayLengthM.toFixed(2)}米 长 (${totalAreaM2.toFixed(1)} ㎡)\n` 
      : `📐 Dimensions: ${totalRowWidthM.toFixed(2)}m W × ${totalArrayLengthM.toFixed(2)}m L (${totalAreaM2.toFixed(1)} m²)\n`;
    
    const roofName = isZh ? (selectedRoofMount.nameZh || selectedRoofMount.nameEn) : isEn ? selectedRoofMount.nameEn : selectedRoofMount.nameMy.split('(')[0].trim();
    text += isZh ? `🔩 支架结构: ${railLength}米 导轨, ${roofName}\n` : `🔩 Structure: ${railLength}m Rails, ${roofName}\n`;
    
    if (hasWalkway) {
      text += isZh 
        ? `🚶 检修通道: 已配置 (${(walkwayWidthM * 1000).toFixed(0)}mm 宽，总长 ${hardware.walkwayLengthM.toFixed(1)}米)\n`
        : isEn 
        ? `🚶 Maintenance Walkway: Included (${(walkwayWidthM * 1000).toFixed(0)}mm width, total ${hardware.walkwayLengthM.toFixed(1)}m)\n`
        : `🚶 Maintenance Walkway: ပါရှိသည် (${(walkwayWidthM * 1000).toFixed(0)}mm အကျယ်၊ စုစုပေါင်း ${hardware.walkwayLengthM.toFixed(1)}m)\n`;
    } else {
      text += isZh 
        ? `🚶 检修通道: 不含 (紧密连续排布)\n`
        : isEn
        ? `🚶 Maintenance Walkway: None (Continuous Array)\n`
        : `🚶 Maintenance Walkway: မပါရှိပါ (Continuous Array)\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += isZh ? `📋 所需支架配件与费用清单:\n\n` : isEn ? `📋 Required Hardware & Quotation Items:\n\n` : `📋 လိုအပ်သော ပစ္စည်းများနှင့် ကုန်ကျစရိတ် စာရင်း:\n\n`;

    boqItems.forEach((item, idx) => {
      const itemName = isZh ? (item.nameZh || item.nameEn) : isEn ? item.nameEn : item.nameMy;
      const unit = isZh ? (item.unitZh || item.unitMy) : isEn ? (item.unitEn || item.unitMy) : item.unitMy;
      text += `${idx + 1}. ${itemName}\n`;
      text += isZh 
        ? `   • 数量: ${item.quantity} ${unit} × ${item.unitPrice.toLocaleString()} MMK\n`
        : isEn
        ? `   • Qty: ${item.quantity} ${unit} × ${item.unitPrice.toLocaleString()} MMK\n`
        : `   • အရေအတွက်: ${item.quantity} ${unit} × ${item.unitPrice.toLocaleString()} Ks\n`;
      text += isZh
        ? `   • 小计: ${item.totalPrice.toLocaleString()} MMK\n\n`
        : isEn
        ? `   • Total: ${item.totalPrice.toLocaleString()} MMK\n\n`
        : `   • စုစုပေါင်း: ${item.totalPrice.toLocaleString()} Ks\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += isZh ? `💵 配件小计: ${subtotalKs.toLocaleString()} MMK\n` : isEn ? `💵 Hardware Subtotal: ${subtotalKs.toLocaleString()} MMK\n` : `💵 ပစ္စည်း စုစုပေါင်း: ${subtotalKs.toLocaleString()} MMK\n`;
    if (discountPercent > 0) {
      text += isZh ? `🏷️ 优惠折扣 (${discountPercent}%): -${discountKs.toLocaleString()} MMK\n` : isEn ? `🏷️ Discount (${discountPercent}%): -${discountKs.toLocaleString()} MMK\n` : `🏷️ လျှော့ဈေး (${discountPercent}%): -${discountKs.toLocaleString()} MMK\n`;
    }
    text += isZh ? `💰 最终总计: ${grandTotalKs.toLocaleString()} MMK\n` : isEn ? `💰 Grand Total: ${grandTotalKs.toLocaleString()} MMK\n` : `💰 ကျသင့်ငွေ စုစုပေါင်း: ${grandTotalKs.toLocaleString()} MMK\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ Generated by Solar Mounting & Sizing Pro Suite\n`;

    navigator.clipboard.writeText(text);
    if (onShowToast) {
      onShowToast({
        text: lang === 'my' 
          ? 'Quotation စာသားကို Viber / Telegram အတွက် အောင်မြင်စွာ ကူးယူပြီးပါပြီ!' 
          : lang === 'zh'
          ? '已成功复制报价单文本至剪贴板！'
          : 'Quotation text copied to clipboard for Viber / Telegram!',
        type: 'success'
      });
    }
  };

  // 2. Export CSV File
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel text support
    const isEn = lang === 'en';
    const isZh = lang === 'zh';

    csvContent += isZh 
      ? `光伏支架与配件材料清单与报价表 (BOQ)\n`
      : `SOLAR MOUNTING HARDWARE BOQ & QUOTATION\n`;
    csvContent += isZh
      ? `客户/业主,${customerName || 'N/A'},工程项目,${projectName || '光伏电站项目'}\n`
      : `Customer,${customerName || 'N/A'},Project,${projectName || 'Solar Installation'}\n`;
    csvContent += isZh
      ? `组件总数,${totalPanels},系统功率,${totalKwp.toFixed(2)} kWp,总占地面积,${totalAreaM2.toFixed(1)} m2\n\n`
      : `Total Panels,${totalPanels},System kWp,${totalKwp.toFixed(2)} kWp,Area,${totalAreaM2.toFixed(1)} m2\n\n`;
    csvContent += isZh
      ? `序号,配件名称,规格参数,数量,单位,单价 (MMK),总金额 (MMK)\n`
      : isEn
      ? `No,Item Name,Specifications,Quantity,Unit,Unit Price (MMK),Total Price (MMK)\n`
      : `No,Item Name,Specifications,Quantity,Unit,Unit Price (MMK),Total Price (MMK)\n`;

    boqItems.forEach((item, idx) => {
      const itemName = isZh ? (item.nameZh || item.nameEn) : isEn ? item.nameEn : item.nameMy;
      const unit = isZh ? (item.unitZh || item.unitMy) : isEn ? (item.unitEn || item.unitMy) : item.unitMy;
      const escapedName = `"${itemName.replace(/"/g, '""')}"`;
      const escapedSpec = `"${item.specs.replace(/"/g, '""')}"`;
      csvContent += `${idx + 1},${escapedName},${escapedSpec},${item.quantity},${unit},${item.unitPrice},${item.totalPrice}\n`;
    });

    csvContent += isZh ? `\n,,,,,配件小计,${subtotalKs}\n` : `\n,,,,,Subtotal,${subtotalKs}\n`;
    if (discountPercent > 0) {
      csvContent += isZh ? `,,,,,优惠折扣 (${discountPercent}%),-${discountKs}\n` : `,,,,,Discount (${discountPercent}%),-${discountKs}\n`;
    }
    csvContent += isZh ? `,,,,,最终总金额 (MMK),${grandTotalKs}\n` : `,,,,,Grand Total (MMK),${grandTotalKs}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Solar_Mounting_BOQ_${totalPanels}Panels_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast({
        text: lang === 'my' 
          ? 'BOQ CSV ဖိုင်ကို အောင်မြင်စွာ ဒေါင်းလုဒ်လုပ်ပြီးပါပြီ!' 
          : lang === 'zh'
          ? '已成功下载 BOQ 报价清单 CSV 文件！'
          : 'Downloaded BOQ Quotation CSV file successfully!',
        type: 'success'
      });
    }
  };

  // 3. Print / PDF Export
  const handlePrintQuotation = () => {
    setShowPrintQuotationModal(true);
  };

  // 4. Save Diagram Photo
  const handleSaveDiagramPhoto = async () => {
    if (!diagramRef.current) return;
    setIsExportingImage(true);
    try {
      const canvas = await html2canvas(diagramRef.current, {
        scale: 2,
        backgroundColor: '#0a0f1d',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          sanitizeDocumentForCanvas(clonedDoc, clonedElement as HTMLElement);
        }
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Solar_Array_Diagram_${totalPanels}Panels_${Date.now()}.png`;
      link.click();

      if (onShowToast) {
        onShowToast({
          text: lang === 'my' ? 'ဆိုလာပြား တပ်ဆင်မှုပုံကြမ်းကို ပုံအဖြစ် သိမ်းဆည်းပြီးပါပြီ!' : 'Array schematic diagram saved as high-res PNG image!',
          type: 'success'
        });
      }
    } catch (e) {
      console.error(e);
      if (onShowToast) {
        onShowToast({
          text: lang === 'my' ? 'ပုံထုတ်ယူရာတွင် အမှားဖြစ်နေပါသည်' : 'Failed to capture image',
          type: 'error'
        });
      }
    } finally {
      setIsExportingImage(false);
    }
  };

  // 2D Matrix cell toggle
  const toggleMatrixCell = (rowIndex: number, colIndex: number) => {
    setMatrixGrid(prev => {
      const copy = prev.map(row => [...row]);
      copy[rowIndex][colIndex] = !copy[rowIndex][colIndex];
      return copy;
    });
  };

  // Dynamic Theme styling classes
  const sCard = theme === 'dark' ? 'bg-[#0f172a]/95 border-slate-800 text-slate-100 shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const sCardHeader = theme === 'dark' ? 'border-b border-slate-800/80 bg-slate-900/40' : 'border-b border-slate-100 bg-slate-50/70';
  const sInput = theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
  const sBtnSecondary = theme === 'dark' ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700';

  return (
    <div className="space-y-6 pb-16 w-full max-w-full min-w-0 overflow-hidden">

      {/* ========================================================================= */}
      {/* 1. SOLAR SYSTEM INSTALLATION DETAILS (တပ်ဆင်မည့် ဆိုလာစနစ် အချက်အလက်များ) */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border ${sCard} overflow-hidden transition-all duration-200`}>
        {/* Section 1 Header */}
        <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${sCardHeader}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
                <span>{t.section1Title}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate sm:overflow-visible">
                {t.section1Desc}
              </p>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={handleResetToDefault}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${sBtnSecondary} transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 shrink-0 self-start sm:self-auto`}
            title="Reset all settings to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDefault}</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">

          {/* LAYOUT MODE HEADER & SYSTEM SUMMARY */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Grid className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>{t.layoutModeTitle}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.layoutModeDesc}
                  </p>
                </div>
              </div>

              {/* Summary of Array Count */}
              <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {t.totalSummary} {activeRowsCount} {t.rowsUnit} × {totalPanels} {t.panelsUnit} ({totalKwp.toFixed(2)} kWp)
                </span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* WALKWAY FUNCTION (Walkway ပါတာ / မပါတာ ရွေးချယ်မှု) */}
            {/* ========================================================================= */}
            <div className={`p-4 rounded-2xl border transition-all ${
              hasWalkway 
                ? 'bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/20' 
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${hasWalkway ? 'bg-amber-500 text-white' : 'bg-slate-700/20 text-slate-400'}`}>
                    <Footprints className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{t.walkwayOption}</span>
                      {hasWalkway && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500 text-white font-black animate-pulse">
                          {t.walkwayEnabled}
                        </span>
                      )}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.walkwayOptionDesc}
                    </p>
                  </div>
                </div>

                {/* Status indicator badge */}
                <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border self-start sm:self-auto ${
                  hasWalkway 
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                    : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                }`}>
                  {hasWalkway ? `${t.walkwayWith} (${(walkwayWidthM * 1000).toFixed(0)}mm)` : t.walkwayWithout}
                </span>
              </div>

              {/* 2 Main Choice Buttons: Walkway မပါ vs Walkway ပါမည် */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {/* Option 1: Walkway မပါ */}
                <button
                  type="button"
                  onClick={() => setHasWalkway(false)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    !hasWalkway
                      ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                      : `${sBtnSecondary} opacity-75 hover:opacity-100`
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${!hasWalkway ? 'bg-blue-500 text-white' : 'bg-slate-700/20 text-slate-400'}`}>
                      <X className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-[13px] flex items-center gap-1.5">
                        <span>❌ {t.walkwayWithout}</span>
                        {!hasWalkway && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 ml-auto" />}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {t.walkwayWithoutDesc}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Option 2: Walkway ပါမည် */}
                <button
                  type="button"
                  onClick={() => setHasWalkway(true)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    hasWalkway
                      ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30 shadow-sm'
                      : `${sBtnSecondary} opacity-75 hover:opacity-100`
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${hasWalkway ? 'bg-amber-500 text-white' : 'bg-slate-700/20 text-slate-400'}`}>
                      <Footprints className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-[13px] flex items-center gap-1.5">
                        <span>🚶 {t.walkwayWith}</span>
                        {hasWalkway && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-auto" />}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {t.walkwayWithDesc}
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* WALKWAY DETAILED CONFIGURATION (Shown when hasWalkway === true) */}
              {hasWalkway && (
                <div className="pt-3 border-t border-amber-500/20 space-y-4">
                  {/* Walkway Direction / Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>{t.walkwayDirectionLabel}</span>
                      <span className="text-[10px] text-amber-500 font-mono font-semibold">
                        {t.walkwayDirectionHint}
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setWalkwayType('rows')}
                        className={`py-2 px-3 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          walkwayType === 'rows'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Between Rows"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>{t.walkwayTypeRows}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalkwayType('cols')}
                        className={`py-2 px-3 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          walkwayType === 'cols'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Between Columns"
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>{t.walkwayTypeCols}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalkwayType('both')}
                        className={`py-2 px-3 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          walkwayType === 'both'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Both Rows & Columns"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>{t.walkwayTypeBoth}</span>
                      </button>
                    </div>
                  </div>

                  {/* Flexible Walkway Row Dividers Selection (Multi-Position) */}
                  {(walkwayType === 'rows' || walkwayType === 'both') && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Rows className="w-3.5 h-3.5 text-amber-500" />
                          <span>{lang === 'zh' ? '行间检修走道设置 (ROW WALKWAY POSITIONS)' : lang === 'en' ? 'Row Walkway Positions' : 'အတန်းကြား လျှောက်လမ်း ထည့်မည့်နေရာများ (ROW WALKWAY POSITIONS)'}</span>
                        </label>
                        {/* Quick Row Presets */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const center = Math.floor(matrixRows / 2);
                              setWalkwayRows(center >= 1 ? [center] : [1]);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500/20 cursor-pointer"
                          >
                            {lang === 'zh' ? '居中' : lang === 'en' ? 'Center' : 'အလယ်တန်း'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const evens: number[] = [];
                              for (let i = 2; i < matrixRows; i += 2) evens.push(i);
                              setWalkwayRows(evens.length > 0 ? evens : [1]);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500/20 cursor-pointer"
                          >
                            {lang === 'zh' ? '每2排' : lang === 'en' ? 'Every 2' : '၂ တန်းခြား'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setWalkwayRows([])}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 cursor-pointer"
                          >
                            {lang === 'zh' ? '清除' : lang === 'en' ? 'Clear' : 'အားလုံးဖျက်'}
                          </button>
                        </div>
                      </div>

                      {/* Interactive Row Divider Chips */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {Array.from({ length: Math.max(1, matrixRows - 1) }).map((_, i) => {
                          const rowDiv = i + 1;
                          const isSelected = walkwayRows.includes(rowDiv);
                          return (
                            <button
                              key={rowDiv}
                              type="button"
                              onClick={() => handleToggleWalkwayRow(rowDiv)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                isSelected
                                  ? 'bg-amber-500 text-white ring-2 ring-amber-500/40'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <Footprints className="w-3 h-3" />
                              <span>{lang === 'zh' ? `第 ${rowDiv} 排与第 ${rowDiv + 1} 排之间` : lang === 'en' ? `Row ${rowDiv} & Row ${rowDiv + 1}` : `Row ${rowDiv} နှင့် Row ${rowDiv + 1} ကြား`}</span>
                              {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Flexible Walkway Column Dividers Selection (Multi-Position) */}
                  {(walkwayType === 'cols' || walkwayType === 'both') && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Columns className="w-3.5 h-3.5 text-amber-500" />
                          <span>{lang === 'zh' ? '列间检修走道设置 (COLUMN WALKWAY POSITIONS)' : lang === 'en' ? 'Column Walkway Positions' : 'ကော်လံကြား လျှောက်လမ်း ထည့်မည့်နေရာများ (COLUMN WALKWAY POSITIONS)'}</span>
                        </label>
                        {/* Quick Col Presets */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const center = Math.floor(matrixCols / 2);
                              setWalkwayCols(center >= 1 ? [center] : [1]);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500/20 cursor-pointer"
                          >
                            {lang === 'zh' ? '居中' : lang === 'en' ? 'Center' : 'အလယ်ကော်လံ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const step = 3;
                              const items: number[] = [];
                              for (let i = step; i < matrixCols; i += step) items.push(i);
                              setWalkwayCols(items.length > 0 ? items : [Math.floor(matrixCols / 2)]);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500/20 cursor-pointer"
                          >
                            {lang === 'zh' ? '每3列' : lang === 'en' ? 'Every 3' : '၃ ကော်လံခြား'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setWalkwayCols([])}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 cursor-pointer"
                          >
                            {lang === 'zh' ? '清除' : lang === 'en' ? 'Clear' : 'အားလုံးဖျက်'}
                          </button>
                        </div>
                      </div>

                      {/* Interactive Col Divider Chips */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {Array.from({ length: Math.max(1, matrixCols - 1) }).map((_, i) => {
                          const colDiv = i + 1;
                          const isSelected = walkwayCols.includes(colDiv);
                          return (
                            <button
                              key={colDiv}
                              type="button"
                              onClick={() => handleToggleWalkwayCol(colDiv)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                isSelected
                                  ? 'bg-amber-500 text-white ring-2 ring-amber-500/40'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <Footprints className="w-3 h-3" />
                              <span>{t.walkwayBetweenCols.replace('{c1}', colDiv.toString()).replace('{c2}', (colDiv + 1).toString())}</span>
                              {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Walkway Width & BOQ Inclusion Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    {/* Walkway Width */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t.walkwayWidth}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.05"
                          min="0.30"
                          max="2.00"
                          value={walkwayWidthM}
                          onChange={(e) => setWalkwayWidthM(Math.max(0.3, parseFloat(e.target.value) || 0.6))}
                          className={`w-full h-9 px-3 pr-8 rounded-lg font-mono font-bold text-xs sm:text-sm border ${sInput}`}
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">m</span>
                      </div>
                      {/* Quick Width Pills */}
                      <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5">
                        {[0.40, 0.50, 0.60, 0.80, 1.00].map(w => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWalkwayWidthM(w)}
                            className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer transition-all ${
                              walkwayWidthM === w
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/20'
                            }`}
                          >
                            {(w * 1000).toFixed(0)}mm
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Include in BOQ Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 h-auto sm:h-14">
                      <label className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeWalkwayBoq}
                          onChange={(e) => setIncludeWalkwayBoq(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>✓ {t.includeInBoq}</span>
                      </label>
                      <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        {hardware.walkwayLengthM.toFixed(1)}m
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SOLAR PANEL ORIENTATION CONTROLS (Portrait vs Landscape) */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-xl border bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 border-blue-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500 text-white">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{t.orientationSectionTitle}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.orientationSectionDesc}
                  </p>
                </div>
              </div>

              {/* Quick Global Switchers */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSetAllPortrait}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    globalOrientation === 'portrait'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                  }`}
                  title={t.allPortrait}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{t.allPortrait}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetAllLandscape}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    globalOrientation === 'landscape'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                  title={t.allLandscape}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{t.allLandscape}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2D MATRIX INTERACTIVE GRID CONTROLS */}
          {/* ========================================================================= */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'} space-y-4 w-full max-w-full min-w-0 overflow-hidden`}>
            {/* Header with Quick Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t.matrixHeader}</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.matrixDesc}
                </p>
              </div>

              {/* Action Buttons: Select All, Clear All, Invert, Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm transition-all active:scale-95"
                >
                  {t.selectAll}
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-rose-500/10 hover:text-rose-500 text-slate-600 dark:text-slate-400 cursor-pointer transition-all active:scale-95"
                >
                  {t.clearAll}
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer transition-all active:scale-95"
                >
                  {t.invertSelection}
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(2, 4)}
                  className="px-2 py-1 text-xs font-mono font-bold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-500/20 cursor-pointer transition-all"
                  title="Preset 2 rows x 4 cols"
                >
                  {t.preset4x2}
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(2, 6)}
                  className="px-2 py-1 text-xs font-mono font-bold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-500/20 cursor-pointer transition-all"
                  title="Preset 2 rows x 6 cols"
                >
                  {t.preset6x2}
                </button>
              </div>
            </div>

            {/* Matrix Size Dimensions Steppers: Rows and Cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rows Count */}
              <div className={`p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.rowsCount}</span>
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    {matrixRows} {t.rowsUnitLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateMatrixDimensions(matrixRows - 1, matrixCols)}
                    className={`w-9 h-9 rounded-lg border ${sBtnSecondary} flex items-center justify-center font-bold text-base cursor-pointer active:scale-95`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={matrixRows}
                    onChange={(e) => handleUpdateMatrixDimensions(parseInt(e.target.value) || 1, matrixCols)}
                    className={`flex-1 h-9 text-center font-mono font-black text-base rounded-lg border ${sInput}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateMatrixDimensions(matrixRows + 1, matrixCols)}
                    className={`w-9 h-9 rounded-lg border ${sBtnSecondary} flex items-center justify-center font-bold text-base cursor-pointer active:scale-95`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">QUICK:</span>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleUpdateMatrixDimensions(n, matrixCols)}
                      className={`px-2 py-0.5 text-xs font-mono font-bold rounded cursor-pointer transition-all ${
                        matrixRows === n
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Columns Count */}
              <div className={`p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t.colsCount}</span>
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    {matrixCols} {t.colsUnitLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateMatrixDimensions(matrixRows, matrixCols - 1)}
                    className={`w-9 h-9 rounded-lg border ${sBtnSecondary} flex items-center justify-center font-bold text-base cursor-pointer active:scale-95`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={matrixCols}
                    onChange={(e) => handleUpdateMatrixDimensions(matrixRows, parseInt(e.target.value) || 2)}
                    className={`flex-1 h-9 text-center font-mono font-black text-base rounded-lg border ${sInput}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateMatrixDimensions(matrixRows, matrixCols + 1)}
                    className={`w-9 h-9 rounded-lg border ${sBtnSecondary} flex items-center justify-center font-bold text-base cursor-pointer active:scale-95`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">QUICK:</span>
                  {[2, 4, 6, 8, 10, 12, 16].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleUpdateMatrixDimensions(matrixRows, n)}
                      className={`px-2 py-0.5 text-xs font-mono font-bold rounded cursor-pointer transition-all ${
                        matrixCols === n
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-500/20'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive 2D Matrix Table with Visible Horizontal Scrollbar */}
            <div className="w-full max-w-full overflow-x-auto pb-3 pt-1 array-scroll-container">
              <div className="inline-block min-w-max p-4 rounded-xl bg-slate-950/90 border border-slate-800 shadow-inner">
                {/* Column Headers */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-14 text-[10px] font-mono font-bold text-slate-500 text-center shrink-0">
                    ROW \ COL
                  </span>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: matrixCols }).map((_, cIdx) => {
                      const isColWalkway = activeWalkwayCols.includes(cIdx);
                      return (
                        <React.Fragment key={cIdx}>
                          {/* Vertical Walkway Header Divider */}
                          {hasWalkway && (walkwayType === 'cols' || walkwayType === 'both') && cIdx > 0 && isColWalkway && (
                            <button
                              type="button"
                              onClick={() => handleToggleWalkwayCol(cIdx)}
                              className="w-7 h-6 rounded bg-amber-500/20 hover:bg-rose-500/20 border border-amber-500/40 text-amber-400 hover:text-rose-400 flex items-center justify-center text-[10px] font-mono font-black shrink-0 transition-all cursor-pointer"
                              title={`Walkway after Col ${cIdx}: Click to remove`}
                            >
                              🚶
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleCol(cIdx)}
                            className="min-w-[52px] sm:min-w-[56px] w-14 h-6 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title={`Click to toggle Column #${cIdx + 1}`}
                          >
                            C{cIdx + 1}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Rows & Cells */}
                <div className="space-y-2">
                  {matrixGrid.map((row, rIdx) => {
                    const isRowWalkway = activeWalkwayRows.includes(rIdx);
                    return (
                      <React.Fragment key={rIdx}>
                        {/* Horizontal Walkway Row Divider in Matrix Grid - Slim Size */}
                        {hasWalkway && (walkwayType === 'rows' || walkwayType === 'both') && rIdx > 0 && isRowWalkway && (
                          <div className="relative py-0.5 px-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-amber-400 text-[10px] font-bold font-mono">
                            <div className="flex items-center gap-1.5">
                              <Footprints className="w-3 h-3 shrink-0" />
                              <span>{t.walkwayBetweenRows.replace('{width}', (walkwayWidthM * 1000).toFixed(0))}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleWalkwayRow(rIdx)}
                              className="px-1.5 py-0.2 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-[9px] font-mono cursor-pointer transition-all"
                            >
                              {t.removeWalkway}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {/* Row Header with Flip Row Orientation Button */}
                          <div className="w-14 h-16 sm:h-20 rounded-lg bg-slate-800 flex flex-col items-center justify-between p-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleRow(rIdx)}
                              className="w-full text-slate-300 hover:text-emerald-400 text-[10px] font-mono font-bold cursor-pointer transition-all text-center"
                              title={`Click to toggle Row #${rIdx + 1}`}
                            >
                              R{rIdx + 1}
                            </button>
                            <span className="text-[9px] font-mono text-slate-400">
                              {row.filter(Boolean).length}P
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleRowOrientation(rIdx)}
                              className="w-full py-0.5 rounded bg-slate-700/80 hover:bg-indigo-600 text-[9px] text-slate-300 hover:text-white font-mono flex items-center justify-center gap-0.5 cursor-pointer transition-all"
                              title={`Rotate all panels in Row #${rIdx + 1}`}
                            >
                              <RotateCw className="w-2.5 h-2.5" />
                              <span>{t.rotateRow}</span>
                            </button>
                          </div>

                          {/* Row Cells */}
                          <div className="flex items-center gap-2">
                            {row.map((active, cIdx) => {
                              const isColWalkway = activeWalkwayCols.includes(cIdx);
                              const cellOrient = matrixOrientation[rIdx]?.[cIdx] || 'portrait';
                              const isLandscape = cellOrient === 'landscape';

                              return (
                                <React.Fragment key={cIdx}>
                                  {/* Vertical Walkway Column Divider between cells */}
                                  {hasWalkway && (walkwayType === 'cols' || walkwayType === 'both') && cIdx > 0 && isColWalkway && (
                                    <div
                                      onClick={() => handleToggleWalkwayCol(cIdx)}
                                      className="w-7 h-16 sm:h-20 rounded-lg bg-amber-500/15 hover:bg-rose-500/20 border border-dashed border-amber-500/40 hover:border-rose-500 text-amber-400 hover:text-rose-400 flex flex-col items-center justify-center text-[10px] shrink-0 font-mono font-bold cursor-pointer transition-all"
                                      title={`Walkway after Col ${cIdx}: Click to remove`}
                                    >
                                      <Footprints className="w-3.5 h-3.5" />
                                      <span className="text-[8px] mt-0.5">{(walkwayWidthM * 1000).toFixed(0)}</span>
                                    </div>
                                  )}

                                  <div
                                    className={`min-w-[52px] sm:min-w-[56px] w-14 h-16 sm:h-20 rounded-xl border flex flex-col items-center justify-between p-1.5 transition-all shrink-0 relative ${
                                      active
                                        ? isLandscape
                                          ? 'bg-gradient-to-b from-indigo-700 to-indigo-900 border-indigo-400 text-white shadow-md shadow-indigo-500/30'
                                          : 'bg-gradient-to-b from-blue-600 to-blue-800 border-blue-400 text-white shadow-md shadow-blue-500/30'
                                        : 'bg-slate-900/60 border-slate-800 text-slate-600 hover:border-slate-600'
                                    }`}
                                  >
                                    {/* Cell Number & Direct Rotate Button */}
                                    <div className="w-full flex items-center justify-between">
                                      <span className="text-[9px] font-mono font-bold">
                                        #{cIdx + 1}
                                      </span>
                                      {active && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleToggleOrientation(rIdx, cIdx, e)}
                                          className={`p-0.5 rounded cursor-pointer transition-all ${
                                            isLandscape
                                              ? 'bg-indigo-400 text-slate-950 hover:bg-white'
                                              : 'bg-blue-400 text-slate-950 hover:bg-white'
                                          }`}
                                          title={isLandscape ? "Landscape -> Portrait" : "Portrait -> Landscape"}
                                        >
                                          <RotateCw className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Main Body - Click to toggle active / empty */}
                                    <div
                                      onClick={() => handleToggleCell(rIdx, cIdx)}
                                      className="flex-1 w-full flex flex-col items-center justify-center cursor-pointer"
                                      title={`Row ${rIdx + 1}, Col ${cIdx + 1}: Click to toggle`}
                                    >
                                      {active ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-[9px] font-mono font-black leading-none">
                                            {isLandscape ? '💻 L' : '📱 P'}
                                          </span>
                                          <span className="text-[7px] font-mono opacity-80 mt-0.5">
                                            {panelWatt}W
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[8px] font-mono opacity-50">OFF</span>
                                      )}
                                    </div>

                                    {/* Orientation Status Pill */}
                                    {active && (
                                      <span className={`text-[7px] font-mono font-bold px-1 rounded ${
                                        isLandscape ? 'bg-indigo-950/80 text-indigo-300' : 'bg-blue-950/80 text-blue-300'
                                      }`}>
                                        {isLandscape ? t.landscapeBadge : t.portraitBadge}
                                      </span>
                                    )}
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Horizontal Scroll Hint if Column count >= 8 */}
            {matrixCols >= 8 && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span>↔️</span>
                  <span>{t.scrollHintCols.replace('{cols}', matrixCols.toString())}</span>
                </span>
                <span className="text-slate-500 hidden sm:inline">{t.horizontalScrollEnabled}</span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SOLAR PANEL SPECS & DATABASE INTEGRATION */}
          {/* ========================================================================= */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Database className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>{t.panelSpecsTitle}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.panelSpecsDesc}
                  </p>
                </div>
              </div>

              {/* Database Open Modal Buttons */}
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                {onOpenMountingDbModal && (
                  <button
                    type="button"
                    onClick={onOpenMountingDbModal}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-500/30 shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                    title="Excel / CSV Templates & Admin Database"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? '📁 Mounting DB (Excel/CSV)' : '📁 Mounting DB (Excel/CSV)'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPanelDbModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{t.openPanelDb.replace('{count}', allDatabasePanels.length.toString())}</span>
                </button>
              </div>
            </div>

            {/* Currently Selected Panel Banner Card */}
            <div className="p-3.5 rounded-xl border bg-amber-500/5 border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    {t.selectedPanelModel}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {allDatabasePanels.find(p => p.id === selectedPresetId)?.name || `Custom ${panelWatt}W Panel`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                    <span>{t.lengthLabel} <strong className="text-slate-700 dark:text-slate-200">{(panelLength * 1000).toFixed(0)} mm</strong></span>
                    <span>•</span>
                    <span>{t.widthLabel} <strong className="text-slate-700 dark:text-slate-200">{(panelWidth * 1000).toFixed(0)} mm</strong></span>
                    <span>•</span>
                    <span>{t.thicknessLabel} <strong className="text-slate-700 dark:text-slate-200">{panelThickness} mm</strong></span>
                    <span>•</span>
                    <span>{t.powerLabel} <strong className="text-amber-500">{panelWatt} W</strong></span>
                  </div>
                </div>
              </div>

              {/* Quick Save to Database Button */}
              <button
                type="button"
                onClick={handleQuickSaveCurrentDimensions}
                className="px-3 py-1.5 rounded-lg border border-amber-500/50 bg-white dark:bg-slate-900 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0 self-start sm:self-auto"
                title="Save current dimensions into custom database"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.saveCurrentDimensions}</span>
              </button>
            </div>

            {/* Top Database Presets Quick Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {allDatabasePanels.slice(0, 4).map((preset, idx) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={`smc_top_preset_${preset.id}_${idx}`}
                    type="button"
                    onClick={() => handleSelectDatabasePanel(preset)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20 shadow-sm'
                        : `${sBtnSecondary} opacity-85 hover:opacity-100`
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-[13px] truncate">{preset.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      {((preset.length ?? 2.278) * 1000).toFixed(0)}mm × {((preset.width ?? 1.134) * 1000).toFixed(0)}mm | {preset.thickness ?? 30}mm
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dimension Input Fields (Length, Width, Thickness in mm & m) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Length in mm / m */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t.panelLengthMm}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="500"
                    max="3500"
                    value={Math.round(panelLength * 1000)}
                    onChange={(e) => {
                      const mm = parseInt(e.target.value) || 2278;
                      setPanelLength(mm / 1000);
                      setSelectedPresetId('custom');
                    }}
                    className={`w-full h-10 px-3 pr-10 rounded-lg font-mono font-bold text-sm border ${sInput}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">mm</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">= {panelLength.toFixed(3)} m</span>
              </div>

              {/* Width in mm / m */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t.panelWidthMm}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="300"
                    max="2500"
                    value={Math.round(panelWidth * 1000)}
                    onChange={(e) => {
                      const mm = parseInt(e.target.value) || 1134;
                      setPanelWidth(mm / 1000);
                      setSelectedPresetId('custom');
                    }}
                    className={`w-full h-10 px-3 pr-10 rounded-lg font-mono font-bold text-sm border ${sInput}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">mm</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">= {panelWidth.toFixed(3)} m</span>
              </div>

              {/* Frame Thickness */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t.panelThicknessMm}
                </label>
                <select
                  value={panelThickness}
                  onChange={(e) => setPanelThickness(parseInt(e.target.value) || 30)}
                  className={`w-full h-10 px-3 rounded-lg font-bold text-xs sm:text-sm border ${sInput} cursor-pointer`}
                >
                  {FRAME_THICKNESS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Clamp ({panelThickness}mm)</span>
              </div>

              {/* Panel Wattage */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t.panelWattLabel}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="100"
                    max="1000"
                    value={panelWatt}
                    onChange={(e) => {
                      setPanelWatt(parseInt(e.target.value) || 585);
                      setSelectedPresetId('custom');
                    }}
                    className={`w-full h-10 px-3 pr-8 rounded-lg font-mono font-bold text-sm border ${sInput}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">W</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{totalKwp.toFixed(2)} kWp total</span>
              </div>
            </div>
          </div>

          {/* RAIL SPECIFICATIONS & ROOF MOUNT TYPE */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rail Length Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.railLengthDropdown}</span>
                </label>
                <select
                  value={railLength}
                  onChange={(e) => setRailLength(parseFloat(e.target.value))}
                  className={`w-full h-11 px-3 rounded-xl font-bold text-xs sm:text-sm border ${sInput} cursor-pointer`}
                >
                  {RAIL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{t.railStandardNote}</span>
                  <span className="font-mono font-bold text-amber-500">4.20 m</span>
                </div>
              </div>

              {/* Roof Mount Type Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Anchor className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t.roofTypeLabel}</span>
                </label>
                <select
                  value={roofMountType}
                  onChange={(e) => setRoofMountType(e.target.value)}
                  className={`w-full h-11 px-3 rounded-xl font-bold text-xs sm:text-sm border ${sInput} cursor-pointer`}
                >
                  {ROOF_MOUNT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {lang === 'zh' ? (type.nameZh || type.nameEn) : lang === 'en' ? type.nameEn : type.nameMy}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {lang === 'zh' ? (selectedRoofMount.descZh || selectedRoofMount.nameZh || selectedRoofMount.nameEn) : lang === 'en' ? (selectedRoofMount.descEn || selectedRoofMount.nameEn) : selectedRoofMount.descMy}
                </p>
              </div>
            </div>

            {/* Additional Accessories Checkboxes */}
            <div className="mt-4 p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 sm:gap-6">
              <span className="text-xs font-bold text-slate-500 uppercase">{t.hardwareAddons}:</span>
              
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeGrounding}
                  onChange={(e) => setIncludeGrounding(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>{t.groundingClips}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCableClips}
                  onChange={(e) => setIncludeCableClips(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>{t.cableClips}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSpareMargin}
                  onChange={(e) => setIncludeSpareMargin(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>{t.spareMargin}</span>
              </label>
            </div>
          </div>

        </div>
      </div>


      {/* ========================================================================= */}
      {/* 2. REQUIRED SOLAR MOUNTING HARDWARE LIST (လိုအပ်သော ဆိုလာတပ်ဆင်ရေး ပစ္စည်းများ စာရင်း) */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border ${sCard} overflow-hidden transition-all duration-200`}>
        {/* Section 2 Header */}
        <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${sCardHeader}`}>
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white leading-snug">
                <span>{t.section2Title}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {t.section2Desc.replace('{panels}', String(totalPanels)).replace('{rows}', String(effectiveRows.length))}
              </p>
            </div>
          </div>

          {/* Total Hardware Weight Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold shrink-0 self-start sm:self-auto">
            <Scale className="w-4 h-4" />
            <span>{t.hardwareWeight.replace('{weight}', String(hardware.weightKg))}</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* 4 Main Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. End Clamp Card */}
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'END CLAMP' : lang === 'zh' ? '边压块 (END CLAMP)' : 'END CLAMP (အစွန်းထိန်းကလစ်)'}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {t.endClampSub}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-2">
                <span className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {hardware.endClamps < 10 ? `0${hardware.endClamps}` : hardware.endClamps}
                </span>
                <span className="text-xs font-bold text-slate-500">{t.unitPairs}</span>
              </div>
              <div className="h-1 w-full bg-blue-500 rounded-full mb-2"></div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'en'
                  ? 'Clamp at both outer ends of each row (2 pcs × 2 rails × row count)'
                  : lang === 'zh'
                  ? '固定在每排组件的最外侧两端 (2个 × 2条导轨 × 行数)'
                  : 'ဆိုလာအတန်း၏ အစွန်းဆုံးဘက်များတွင် ညှပ်ရန် (၂ ခု × ၂ ရထားလမ်း × အတန်းအရေအတွက်)'}
              </p>
            </div>

            {/* 2. Mid Clamp Card */}
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'MID CLAMP' : lang === 'zh' ? '中压块 (MID CLAMP)' : 'MID CLAMP (အလယ်ထိန်းကလစ်)'}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {t.midClampSub}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-2">
                <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {hardware.midClamps < 10 ? `0${hardware.midClamps}` : hardware.midClamps}
                </span>
                <span className="text-xs font-bold text-slate-500">{t.unitPairs}</span>
              </div>
              <div className="h-1 w-full bg-emerald-500 rounded-full mb-2"></div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'en'
                  ? 'Clamp between adjacent solar panels (Panels - 1 × 2 pcs × row count)'
                  : lang === 'zh'
                  ? '固定在相邻两块组件之间 (组件数 - 1 × 2个 × 行数)'
                  : 'ဆိုလာပြားနှစ်ချပ်ကြားတွင် ညှပ်တွဲရန် (ပြားအရေအတွက် - ၁ × ၂ ခု × အတန်းအရေအတွက်)'}
              </p>
            </div>

            {/* 3. Rail Bars Card */}
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'GI / SOLAR RAIL' : lang === 'zh' ? '镀锌/铝合金导轨 (RAIL)' : 'GI / SOLAR ALUMINUM RAIL'}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  {railLength.toFixed(1)}M BARS
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-2">
                <span className="text-3xl font-black font-mono text-orange-600 dark:text-orange-400">
                  {hardware.railBars < 10 ? `0${hardware.railBars}` : hardware.railBars}
                </span>
                <span className="text-xs font-bold text-slate-500">{t.unitBars}</span>
              </div>
              <div className="h-1 w-full bg-orange-500 rounded-full mb-2"></div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'en'
                  ? `${Math.ceil(hardware.railBars / (effectiveRows.length * 2 || 1))} bars/line × ${effectiveRows.length * 2} lines (Total: ${hardware.totalRailLengthM.toFixed(1)}m)`
                  : lang === 'zh'
                  ? `${Math.ceil(hardware.railBars / (effectiveRows.length * 2 || 1))} 根/线 × ${effectiveRows.length * 2} 条线 (总长度: ${hardware.totalRailLengthM.toFixed(1)}米)`
                  : `${Math.ceil(hardware.railBars / (effectiveRows.length * 2 || 1))} ချောင်း/လိုင်း × ${effectiveRows.length * 2} လိုင်း (စုစုပေါင်း: ${hardware.totalRailLengthM.toFixed(1)}m)`}
              </p>
            </div>

            {/* 4. Rail Splice Joiner Card */}
            <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'en' ? 'RAIL SPLICE JOINER' : lang === 'zh' ? '导轨连接件 (SPLICE JOINER)' : 'RAIL SPLICE JOINER (ရထားလမ်းဆက်ခွင်)'}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  SPLICE KIT
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-2">
                <span className="text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                  {hardware.splices < 10 ? `0${hardware.splices}` : hardware.splices}
                </span>
                <span className="text-xs font-bold text-slate-500">{t.unitPairs}</span>
              </div>
              <div className="h-1 w-full bg-rose-500 rounded-full mb-2"></div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'en'
                  ? 'Splice connectors joining rail sections end-to-end for longer continuous runs'
                  : lang === 'zh'
                  ? '用于连接两段导轨实现延伸长度的标准连接件'
                  : 'Rail အပိုင်းများကို အလျားရှည်အောင် တစ်ခုနှင့်တစ်ခု ဆက်စပ်ပေးသည့် အဆက်ခွင်'}
              </p>
            </div>
          </div>

          {/* Additional Secondary Hardware Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Roof Bracket Card */}
            <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                  <Anchor className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Roof Bracket / L-Feet / Hook
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    L-Feet Kit with Screws (Spacing: 1.2m)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{hardware.brackets}</span>
                <span className="text-xs text-slate-500 ml-1">{t.unitPairs}</span>
              </div>
            </div>

            {/* Grounding & Bonding */}
            <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Grounding Lugs & Bonding Clips
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {hardware.groundingLugs}x Ground Lugs + {hardware.bondingClips}x Bonding Washers
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {hardware.groundingLugs + hardware.bondingClips}
                </span>
                <span className="text-xs text-slate-500 ml-1">{t.unitPcs}</span>
              </div>
            </div>
          </div>

          {/* Walkway Hardware Summary Card (Shown when Walkway is enabled) */}
          {hasWalkway && (
            <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 shadow-sm">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <span>
                      {lang === 'en'
                        ? 'Maintenance Walkway'
                        : lang === 'zh'
                        ? '光伏运维检修走道 (Walkway)'
                        : 'Maintenance Walkway (စစ်ဆေးပြုပြင်ရေး လျှောက်လမ်း)'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {(walkwayWidthM * 1000).toFixed(0)}mm Width
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                    {lang === 'en'
                      ? `Anti-slip grating panels ${Math.ceil(hardware.walkwayLengthM)} meters ${includeWalkwayBoq ? `+ ${hardware.walkwayBrackets} mounting bracket sets (in BOQ)` : ''}`
                      : lang === 'zh'
                      ? `防滑走道板 ${Math.ceil(hardware.walkwayLengthM)} 米 ${includeWalkwayBoq ? `+ ${hardware.walkwayBrackets} 套支撑固定支架 (已计入BOQ)` : ''}`
                      : `စလစ်မဖြစ်သော လျှောက်လမ်းပြား ${Math.ceil(hardware.walkwayLengthM)} မီတာ ${includeWalkwayBoq && `+ အထိုင်ခွင် ${hardware.walkwayBrackets} စုံ (BOQ ထည့်သွင်းထားသည်)`}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {hardware.walkwayLengthM.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 ml-1">m</span>
              </div>
            </div>
          )}

          {/* Info Notice Banner */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {lang === 'en'
                ? `Note: Total ${hardware.splices < 10 ? `0${hardware.splices}` : hardware.splices} Rail Joiners (Splice) required. Total row width is ${totalRowWidthM.toFixed(2)}m (may vary slightly based on roof layout).`
                : lang === 'zh'
                ? `注：总共需要 ${hardware.splices < 10 ? `0${hardware.splices}` : hardware.splices} 个导轨连接件 (Splice)。每排总宽度约为 ${totalRowWidthM.toFixed(2)}米。`
                : `မှတ်ချက်: Rail Joiner (Splice) စုစုပေါင်း ${hardware.splices < 10 ? `0${hardware.splices}` : hardware.splices} ခု လိုအပ်ပါသည်။ တစ်တန်းလျှင် အလျား ${totalRowWidthM.toFixed(2)}m ရှိပြီး မြေပြင်အနေအထားအရ အနည်းငယ် ကွာဟနိုင်ပါသည်။`}
            </p>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* 3. ARRAY SCHEMATIC DIAGRAM (ဆိုလာပြား တပ်ဆင်မှု ပုံကြမ်း) */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border ${sCard} overflow-hidden transition-all duration-200`}>
        {/* Section 3 Header */}
        <div className={`p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 ${sCardHeader}`}>
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
                <span>{t.section3Title}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {t.section3Desc}
              </p>
            </div>
          </div>

          {/* Diagram Mode & Zoom Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start xl:self-center">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('blueprint')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'blueprint' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-white'
                }`}
              >
                Blueprint
              </button>
              <button
                type="button"
                onClick={() => setViewMode('real_glass')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'real_glass' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-white'
                }`}
              >
                Real Glass
              </button>
              <button
                type="button"
                onClick={() => setViewMode('structure_only')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'structure_only' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-white'
                }`}
              >
                Structure Only
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomLevel(Math.max(60, zoomLevel - 15))}
                className={`p-1.5 rounded-lg border ${sBtnSecondary} text-xs cursor-pointer`}
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold px-1.5 text-slate-500">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(Math.min(160, zoomLevel + 15))}
                className={`p-1.5 rounded-lg border ${sBtnSecondary} text-xs cursor-pointer`}
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className={`p-1.5 rounded-lg border ${sBtnSecondary} text-xs cursor-pointer`}
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Download Photo Button */}
            <button
              type="button"
              onClick={handleSaveDiagramPhoto}
              disabled={isExportingImage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isExportingImage ? t.savingPhoto : t.savePhoto}</span>
            </button>

            {/* Quick Expand BOQ Button with Down Arrow */}
            <button
              type="button"
              onClick={() => {
                setIsBoqExpanded(true);
                const el = document.getElementById('roof-boq-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 border border-orange-500/40 font-bold text-xs shadow-sm cursor-pointer transition-all active:scale-95 hover:scale-105"
              title={lang === 'my' ? 'ပစ္စည်းစာရင်း (BOQ) အသေးစိတ်ကို Down Arrow ဖြင့် ဖွင့်ကြည့်မည်' : 'Expand BOQ with Down Arrow'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'BOQ ဖွင့်မည်' : 'Expand BOQ'}</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* 4 Summary Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Width */}
            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t.totalWidth}</div>
              <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {totalRowWidthM.toFixed(2)} m
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{totalRowWidthFt.toFixed(1)} ft</div>
            </div>

            {/* Total Length */}
            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t.totalLength}</div>
              <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {totalArrayLengthM.toFixed(2)} m
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{totalArrayLengthFt.toFixed(1)} ft</div>
            </div>

            {/* Total Panels */}
            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t.totalPanelsCount}</div>
              <div className="text-lg sm:text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                {totalPanels} {t.panelsUnit}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{panelWatt}W per panel</div>
            </div>

            {/* Total kWp */}
            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t.totalCapacity}</div>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalKwp.toFixed(2)} kWp
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{totalAreaM2.toFixed(1)} m² ({Math.round(totalAreaSqft)} sqft)</div>
            </div>
          </div>

          {/* Color Legend Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>{t.endClampLegend} ({hardware.endClamps})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>{t.midClampLegend} ({hardware.midClamps})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1.5 rounded-sm bg-orange-500"></span>
              <span>{t.giRailLegend} ({hardware.railBars})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span>{t.spliceJoinerLegend} ({hardware.splices})</span>
            </div>
          </div>

          {/* INTERACTIVE SCHEMATIC CANVAS / BLUEPRINT CONTAINER */}
          <div
            ref={diagramRef}
            className="p-4 sm:p-6 lg:p-8 rounded-2xl bg-[#070d1e] text-white border border-slate-800 shadow-2xl relative w-full max-w-full min-w-0 overflow-hidden"
          >
            {/* Blueprint Grid Watermark Background */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            ></div>

            {/* Canvas Header inside */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 relative z-10 border-b border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono tracking-widest uppercase text-blue-400 font-extrabold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30 flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5" />
                  <span>{t.structuralPreview}</span>
                </span>

                {/* Diagram Scale / Size Selector (Compact by default) */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 px-1.5 hidden sm:inline">
                    {t.diagramSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDiagramScaleMode('compact')}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      diagramScaleMode === 'compact'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Compact"
                  >
                    {t.sizeCompact}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagramScaleMode('medium')}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      diagramScaleMode === 'medium'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Medium"
                  >
                    {t.sizeMedium}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagramScaleMode('large')}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      diagramScaleMode === 'large'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Large"
                  >
                    {t.sizeLarge}
                  </button>
                </div>

                {/* True Ratio Indicator */}
                <div
                  className="text-[10px] font-mono font-bold text-amber-400/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 flex items-center gap-1"
                  title={`Ratio 1 : ${panelAspectRatio.toFixed(2)}`}
                >
                  <span>Ratio 1 : {panelAspectRatio.toFixed(2)}</span>
                </div>
              </div>

              {/* Interaction Mode Switcher & Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Interaction Mode Switcher on Canvas */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDiagramInteractionMode('toggle_cell')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      diagramInteractionMode === 'toggle_cell'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={t.modeToggleCell}
                  >
                    <span>🖱️ {t.modeToggleCell}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagramInteractionMode('toggle_orientation')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      diagramInteractionMode === 'toggle_orientation'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={t.modeRotate}
                  >
                    <RotateCw className="w-2.5 h-2.5" />
                    <span>{t.modeRotate}</span>
                  </button>
                </div>

                {/* Toggle Substructure Steel Beams */}
                <button
                  type="button"
                  onClick={() => setShowSubstructureBeams(!showSubstructureBeams)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    showSubstructureBeams
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Toggle Sub-structure Steel Beams & Rafters (သံ ဖရိန်နှင့် ပင်မ Beam များ)"
                >
                  <Wrench className="w-2.5 h-2.5 text-cyan-400" />
                  <span>
                    {showSubstructureBeams 
                      ? (lang === 'my' ? 'သံ Beam: ပြထားသည်' : lang === 'zh' ? '钢梁: 显示' : 'Beams: ON') 
                      : (lang === 'my' ? 'သံ Beam: ဖျောက်ထားသည်' : lang === 'zh' ? '钢梁: 隐藏' : 'Beams: OFF')}
                  </span>
                </button>

                {/* Quick Bulk Orientation Actions */}
                <button
                  type="button"
                  onClick={handleSetAllPortrait}
                  className="px-2 py-1 text-[10px] font-mono font-bold rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white cursor-pointer transition-all flex items-center gap-1"
                  title="All Portrait"
                >
                  <Smartphone className="w-2.5 h-2.5" />
                  <span>Portrait</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetAllLandscape}
                  className="px-2 py-1 text-[10px] font-mono font-bold rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white cursor-pointer transition-all flex items-center gap-1"
                  title="All Landscape"
                >
                  <Monitor className="w-2.5 h-2.5" />
                  <span>Landscape</span>
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(40, z - 10))}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-mono font-bold px-1 text-slate-400 min-w-7 text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  {zoomLevel !== 100 && (
                    <button
                      type="button"
                      onClick={() => setZoomLevel(100)}
                      className="px-1 text-[8px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer"
                      title="Reset Zoom"
                    >
                      {t.resetZoom}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveDiagramPhoto}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all hover:bg-amber-500/20"
                >
                  <Camera className="w-3 h-3" />
                  <span>{t.savePhoto}</span>
                </button>
              </div>
            </div>

            {/* Scaled Array Canvas with Smooth Horizontal Scroll & Ratio Locking */}
            <div className="w-full max-w-full overflow-x-auto pb-4 pt-2 relative z-10 array-scroll-container">
              <div className="inline-block min-w-full text-center py-2 px-3">
                <div
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
                  className="inline-block text-left shrink-0"
                >
                  {/* Top Width Dimension Arrow - strict width matching array */}
                  <div className="flex items-center justify-between mb-2 text-center w-full">
                    <div className="h-0.5 bg-blue-400/60 flex-1 relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-l-2 border-t-2 border-blue-400 rotate-[-45deg]"></span>
                    </div>
                    <span className="px-3 text-xs font-mono font-bold text-blue-300 bg-[#070d1e] shrink-0">
                      {totalRowWidthM.toFixed(2)} m (Total Width)
                    </span>
                    <div className="h-0.5 bg-blue-400/60 flex-1 relative">
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-r-2 border-t-2 border-blue-400 rotate-[45deg]"></span>
                    </div>
                  </div>

                  {/* Array Rows Container */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Left Height Dimension Arrow */}
                    <div className="flex flex-col items-center justify-between h-full py-1 shrink-0">
                      <div className="w-0.5 bg-blue-400/60 flex-1 relative">
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 border-l-2 border-t-2 border-blue-400 rotate-[45deg]"></span>
                      </div>
                      <span className="py-2 text-[10px] font-mono font-bold text-blue-300 [writing-mode:vertical-lr] rotate-180">
                        {totalArrayLengthM.toFixed(2)} m
                      </span>
                      <div className="w-0.5 bg-blue-400/60 flex-1 relative">
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 border-l-2 border-b-2 border-blue-400 rotate-[-45deg]"></span>
                      </div>
                    </div>

                    {/* Visual Rows Render (2D Matrix, Multiple Walkways & Mixed Orientation Layout) */}
                    <div className="space-y-3 shrink-0">
                      {matrixGrid.map((row, rIdx) => {
                        const isHorizontalWalkwayHere = hasWalkway && (walkwayType === 'rows' || walkwayType === 'both') && activeWalkwayRows.includes(rIdx);

                        // Determine maximum height of panels in this row for vertical alignment
                        const rowHasPortrait = row.some((_, colIdx) => (matrixOrientation[rIdx]?.[colIdx] || 'portrait') === 'portrait');
                        const maxRowHeightPx = rowHasPortrait ? scaleParams.portraitH : scaleParams.landscapeH;

                        return (
                          <React.Fragment key={rIdx}>
                            {/* Horizontal Walkway Corridor before this row if divider matches - Slim & Compact Size */}
                            {isHorizontalWalkwayHere && (
                              <div
                                style={{ height: `${Math.max(13, Math.min(16, Math.round(scaleParams.walkwayRowPx * 0.65)))}px` }}
                                className="relative my-0.5 px-2 rounded bg-slate-900/95 border border-dashed border-amber-500/60 shadow-xs flex items-center justify-between overflow-hidden w-full shrink-0"
                              >
                                {/* Diamond Grating pattern */}
                                <div
                                  className="absolute inset-0 opacity-15 pointer-events-none"
                                  style={{
                                    backgroundImage: 'repeating-linear-gradient(45deg, #eab308 0, #eab308 1.5px, transparent 0, transparent 6px)',
                                    backgroundSize: '6px 6px'
                                  }}
                                ></div>
                                <div className="flex items-center gap-1 relative z-10">
                                  <Footprints className="w-2 h-2 text-amber-400 shrink-0" />
                                  <span className="text-[7px] font-mono font-bold tracking-wider text-amber-300 uppercase">
                                    WALKWAY (Row {rIdx})
                                  </span>
                                </div>
                                <div className="relative z-10 flex items-center gap-1">
                                  <span className="text-[6.5px] font-mono font-bold px-1 rounded bg-amber-500 text-slate-950">
                                    {(walkwayWidthM * 1000).toFixed(0)}mm
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleWalkwayRow(rIdx)}
                                    className="px-1 py-0.2 rounded bg-rose-500/80 hover:bg-rose-500 text-white text-[6.5px] font-mono cursor-pointer transition-all leading-none"
                                    title="Remove walkway at this position"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="relative py-0.5 px-0.5 shrink-0">
                              {/* Panels & Vertical Walkways in this Row */}
                              <div className="flex items-end gap-1 relative z-10 shrink-0">
                                {columnBlocks.map((block, bIdx) => {
                                  const isNextVerticalWalkway = hasWalkway && (walkwayType === 'cols' || walkwayType === 'both') && activeWalkwayCols.includes(block.endCol);

                                  // Find active panels inside this block for clamp positioning & rail span
                                  const blockActiveIndices: number[] = [];
                                  for (let c = block.startCol; c < block.endCol; c++) {
                                    if (row[c]) blockActiveIndices.push(c);
                                  }

                                  return (
                                    <React.Fragment key={bIdx}>
                                      {/* Column Block Wrapper */}
                                      <div className="relative flex items-end shrink-0">
                                        {/* Render Solar Panels for this column block */}
                                        <div className="flex items-end gap-1 relative z-10 shrink-0">
                                          {Array.from({ length: block.endCol - block.startCol }).map((_, innerIdx) => {
                                            const globalColIdx = block.startCol + innerIdx;
                                            const isActive = row[globalColIdx];
                                            const cellOrient = matrixOrientation[rIdx]?.[globalColIdx] || 'portrait';
                                            const isLandscape = cellOrient === 'landscape';

                                            // Exact Physical Dimensions in px based on true aspect ratio
                                            const pWidth = isLandscape ? scaleParams.landscapeW : scaleParams.portraitW;
                                            const pHeight = isLandscape ? scaleParams.landscapeH : scaleParams.portraitH;

                                            const isFirstActive = isActive && globalColIdx === blockActiveIndices[0];
                                            const isLastActive = isActive && globalColIdx === blockActiveIndices[blockActiveIndices.length - 1];
                                            const hasNextAdjacentActive = isActive && globalColIdx + 1 < block.endCol && row[globalColIdx + 1];

                                            const handlePanelClick = () => {
                                              if (diagramInteractionMode === 'toggle_orientation' && isActive) {
                                                handleToggleOrientation(rIdx, globalColIdx);
                                              } else {
                                                handleToggleCell(rIdx, globalColIdx);
                                              }
                                            };

                                            if (!isActive) {
                                              return (
                                                <div
                                                  key={globalColIdx}
                                                  onClick={handlePanelClick}
                                                  style={{
                                                    width: `${pWidth}px`,
                                                    height: `${pHeight}px`
                                                  }}
                                                  className="rounded-md border border-dashed border-slate-700/60 bg-slate-900/20 hover:border-blue-500/60 hover:bg-blue-950/20 flex flex-col items-center justify-center p-0.5 text-center transition-all cursor-pointer group shrink-0"
                                                  title={`Row ${rIdx + 1}, Col ${globalColIdx + 1}: Click to place panel (${isLandscape ? 'Landscape' : 'Portrait'})`}
                                                >
                                                  <span className="text-[7.5px] font-mono text-slate-500 group-hover:text-blue-400">
                                                    + #{globalColIdx + 1}
                                                  </span>
                                                </div>
                                              );
                                            }

                                            return (
                                              <div key={globalColIdx} className="relative flex items-end shrink-0">
                                                {/* Sub-Structure Steel Support Beams / Rafters (သံ ဖရိန် ပင်မ Beam များ - Fitted for Landscape & Portrait) */}
                                                {(showSubstructureBeams || viewMode === 'structure_only') && (
                                                  <>
                                                    {isLandscape ? (
                                                      // Landscape Panel Support Frame (2.28m wide span supported at left 20%, center 50%, right 20%)
                                                      <>
                                                        <div
                                                          className="absolute w-2 -top-2.5 -bottom-2.5 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500 dark:from-slate-700 dark:via-slate-500 dark:to-slate-700 rounded-xs shadow-xs pointer-events-none border-x border-slate-600/60 z-0"
                                                          style={{ left: '20%' }}
                                                          title="C-Steel Support Beam / Roof Purlin (သံ ဖရိန် ထုတ်တန်း - ဘယ် ၂၀%)"
                                                        >
                                                          <span className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                          <span className="absolute bottom-[20%] left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                        </div>
                                                        <div
                                                          className="absolute w-2 -top-2.5 -bottom-2.5 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500 dark:from-slate-700 dark:via-slate-500 dark:to-slate-700 rounded-xs shadow-xs pointer-events-none border-x border-slate-600/60 z-0 opacity-90"
                                                          style={{ left: '50%', transform: 'translateX(-50%)' }}
                                                          title="C-Steel Center Support Beam / Roof Purlin (သံ ဖရိန် အလယ်ထုတ်တန်း - 2.28m အလျားလိုက် ဆိုလာပြား အလယ်ထိန်း)"
                                                        >
                                                          <span className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                          <span className="absolute bottom-[20%] left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                        </div>
                                                        <div
                                                          className="absolute w-2 -top-2.5 -bottom-2.5 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500 dark:from-slate-700 dark:via-slate-500 dark:to-slate-700 rounded-xs shadow-xs pointer-events-none border-x border-slate-600/60 z-0"
                                                          style={{ right: '20%' }}
                                                          title="C-Steel Support Beam / Roof Purlin (သံ ဖရိန် ထုတ်တန်း - ညာ ၂၀%)"
                                                        >
                                                          <span className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                          <span className="absolute bottom-[20%] left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                        </div>
                                                      </>
                                                    ) : (
                                                      // Portrait Panel Support Frame (2 bents at 24% and 76%)
                                                      <>
                                                        <div
                                                          className="absolute w-2 -top-2.5 -bottom-2.5 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500 dark:from-slate-700 dark:via-slate-500 dark:to-slate-700 rounded-xs shadow-xs pointer-events-none border-x border-slate-600/60 z-0"
                                                          style={{ left: '24%' }}
                                                          title="C-Steel Support Beam / Rafter (သံ ဖရိန် ပင်မ Beam)"
                                                        >
                                                          <span className="absolute top-[26%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                          <span className="absolute bottom-[26%] left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                        </div>

                                                        <div
                                                          className="absolute w-2 -top-2.5 -bottom-2.5 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500 dark:from-slate-700 dark:via-slate-500 dark:to-slate-700 rounded-xs shadow-xs pointer-events-none border-x border-slate-600/60 z-0"
                                                          style={{ right: '24%' }}
                                                          title="C-Steel Support Beam / Rafter (သံ ဖရိန် ပင်မ Beam)"
                                                        >
                                                          <span className="absolute top-[26%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                          <span className="absolute bottom-[26%] left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-1.5 rounded-xs bg-amber-400 ring-1 ring-slate-900 shadow"></span>
                                                        </div>
                                                      </>
                                                    )}
                                                  </>
                                                )}

                                                {/* GI Rail lines strictly behind THIS active panel only (fitted to clamping zones) */}
                                                <div
                                                  className={`absolute h-1 bg-orange-500 rounded-xs shadow-xs z-0 pointer-events-none ${
                                                    isFirstActive ? '-left-2' : '-left-1'
                                                  } ${
                                                    isLastActive ? '-right-2' : hasNextAdjacentActive ? '-right-1.5' : '-right-2'
                                                  }`}
                                                  style={{ top: isLandscape ? '20%' : '26%' }}
                                                >
                                                  {/* Splice joiner indicator if multiple rails needed */}
                                                  {hardware.splices > 0 && innerIdx > 0 && innerIdx % 2 === 0 && (
                                                    <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ring-white shadow"></span>
                                                  )}
                                                </div>
                                                <div
                                                  className={`absolute h-1 bg-orange-500 rounded-xs shadow-xs z-0 pointer-events-none ${
                                                    isFirstActive ? '-left-2' : '-left-1'
                                                  } ${
                                                    isLastActive ? '-right-2' : hasNextAdjacentActive ? '-right-1.5' : '-right-2'
                                                  }`}
                                                  style={{ bottom: isLandscape ? '20%' : '26%' }}
                                                >
                                                  {/* Splice joiner indicator if multiple rails needed */}
                                                  {hardware.splices > 0 && innerIdx > 0 && innerIdx % 2 === 0 && (
                                                    <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ring-white shadow"></span>
                                                  )}
                                                </div>

                                                {/* Left End Clamp if first active in this block */}
                                                {isFirstActive && (
                                                  <div
                                                    style={{ height: `${pHeight}px` }}
                                                    className="absolute -left-1.5 top-0 w-1.5 z-20 pointer-events-none"
                                                  >
                                                    <span
                                                      className="absolute w-1.5 h-2 rounded-xs bg-blue-500 border border-white/80 shadow -translate-y-1/2"
                                                      style={{ top: isLandscape ? '20%' : '26%' }}
                                                    ></span>
                                                    <span
                                                      className="absolute w-1.5 h-2 rounded-xs bg-blue-500 border border-white/80 shadow translate-y-1/2"
                                                      style={{ bottom: isLandscape ? '20%' : '26%' }}
                                                    ></span>
                                                  </div>
                                                )}

                                                {/* Solar Panel Box (Portrait vs Landscape Responsive with True Aspect Ratio) */}
                                                <div
                                                  onClick={handlePanelClick}
                                                  style={{
                                                    width: `${pWidth}px`,
                                                    height: `${pHeight}px`
                                                  }}
                                                  className={`rounded-md border flex flex-col justify-between p-1 text-center transition-all cursor-pointer relative group shrink-0 select-none ${
                                                    viewMode === 'structure_only'
                                                      ? 'bg-transparent border-dashed border-sky-400/40 text-sky-400'
                                                      : viewMode === 'real_glass'
                                                      ? isLandscape
                                                        ? 'bg-gradient-to-r from-[#1e1b4b] to-[#0f172a] border-indigo-400/80 shadow-md text-white'
                                                        : 'bg-gradient-to-b from-[#172554] to-[#0f172a] border-slate-300/80 shadow-md text-white'
                                                      : isLandscape
                                                      ? 'bg-indigo-950/90 border-indigo-500/80 text-indigo-200 shadow-sm'
                                                      : 'bg-blue-950/90 border-sky-500/80 text-sky-200 shadow-sm'
                                                  }`}
                                                  title={`Row ${rIdx + 1}, Col ${globalColIdx + 1} (${panelWatt}W, ${isLandscape ? 'Landscape' : 'Portrait'} - ${isLandscape ? `${panelLength}m × ${panelWidth}m` : `${panelWidth}m × ${panelLength}m`}): ${
                                                    diagramInteractionMode === 'toggle_orientation' ? 'Click to rotate' : 'Click to remove'
                                                  }`}
                                                >
                                                  {/* Panel Header inside: R & C and Direct Rotate Button */}
                                                  <div className="flex items-center justify-between text-[7.5px] font-mono font-bold leading-none text-sky-300/90">
                                                    <span className="truncate">R{rIdx + 1}-#{globalColIdx + 1}</span>
                                                    {/* Direct 1-Click Rotate Button right on the panel */}
                                                    <button
                                                      type="button"
                                                      onClick={(e) => handleToggleOrientation(rIdx, globalColIdx, e)}
                                                      className="p-0.5 rounded bg-black/70 hover:bg-amber-500 text-white hover:text-black transition-all cursor-pointer shadow z-30 shrink-0"
                                                      title={isLandscape ? "Landscape (အလျားလိုက်) - နှိပ်ပါက Portrait သို့ ပြောင်းမည်" : "Portrait (ဒေါင်လိုက်) - နှိပ်ပါက Landscape သို့ ပြောင်းမည်"}
                                                    >
                                                      <RotateCw className="w-2 h-2" />
                                                    </button>
                                                  </div>

                                                  {/* Internal Half-cut Solar Cell Textures (Portrait: 2x3, Landscape: 3x2) */}
                                                  {isLandscape ? (
                                                    <div className="grid grid-cols-3 gap-0.5 opacity-30 flex-1 my-0.5 pointer-events-none">
                                                      <div className="border border-indigo-400/40 rounded-xs"></div>
                                                      <div className="border border-indigo-400/40 rounded-xs"></div>
                                                      <div className="border border-indigo-400/40 rounded-xs"></div>
                                                      <div className="border border-indigo-400/40 rounded-xs"></div>
                                                      <div className="border border-indigo-400/40 rounded-xs"></div>
                                                      <div className="border border-indigo-400/40 rounded-xs"></div>
                                                    </div>
                                                  ) : (
                                                    <div className="grid grid-cols-2 gap-0.5 opacity-30 flex-1 my-0.5 pointer-events-none">
                                                      <div className="border border-sky-400/40 rounded-xs"></div>
                                                      <div className="border border-sky-400/40 rounded-xs"></div>
                                                      <div className="border border-sky-400/40 rounded-xs"></div>
                                                      <div className="border border-sky-400/40 rounded-xs"></div>
                                                      <div className="border border-sky-400/40 rounded-xs"></div>
                                                      <div className="border border-sky-400/40 rounded-xs"></div>
                                                    </div>
                                                  )}

                                                  {/* Panel Bottom Bar: Wattage & Orientation Badge */}
                                                  <div className="text-[7px] font-mono font-bold bg-black/60 px-0.5 py-0.2 rounded text-white flex items-center justify-between leading-none">
                                                    <span className="text-amber-300 truncate">{panelWatt}W</span>
                                                    <span className={`px-0.5 py-0.2 rounded text-[6.5px] font-black shrink-0 ${isLandscape ? 'bg-indigo-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                      {isLandscape ? 'L' : 'P'}
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* Right End Clamp if last active in this block */}
                                                {isLastActive && (
                                                  <div
                                                    style={{ height: `${pHeight}px` }}
                                                    className="absolute -right-1.5 top-0 w-1.5 z-20 pointer-events-none"
                                                  >
                                                    <span
                                                      className="absolute w-1.5 h-2 rounded-xs bg-blue-500 border border-white/80 shadow -translate-y-1/2"
                                                      style={{ top: isLandscape ? '20%' : '26%' }}
                                                    ></span>
                                                    <span
                                                      className="absolute w-1.5 h-2 rounded-xs bg-blue-500 border border-white/80 shadow translate-y-1/2"
                                                      style={{ bottom: isLandscape ? '20%' : '26%' }}
                                                    ></span>
                                                  </div>
                                                )}

                                                {/* Mid Clamps between adjacent active panels */}
                                                {hasNextAdjacentActive && (
                                                  <div
                                                    style={{ height: `${pHeight}px` }}
                                                    className="w-1 relative z-20 shrink-0 pointer-events-none"
                                                  >
                                                    <span
                                                      className="absolute w-1.5 h-2 -ml-0.5 rounded-xs bg-emerald-500 border border-white shadow -translate-y-1/2"
                                                      style={{ top: isLandscape ? '20%' : '26%' }}
                                                    ></span>
                                                    <span
                                                      className="absolute w-1.5 h-2 -ml-0.5 rounded-xs bg-emerald-500 border border-white shadow translate-y-1/2"
                                                      style={{ bottom: isLandscape ? '20%' : '26%' }}
                                                    ></span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Vertical Walkway Corridor between blocks if active (True Proportional Scale) */}
                                      {isNextVerticalWalkway && (
                                        <div
                                          style={{
                                            width: `${scaleParams.walkwayColPx}px`,
                                            height: `${maxRowHeightPx}px`
                                          }}
                                          className="relative flex flex-col items-center justify-between rounded-md bg-slate-900/95 border-2 border-dashed border-amber-500/70 p-1 text-center shadow-md shrink-0 overflow-hidden"
                                        >
                                          <div
                                            className="absolute inset-0 opacity-25 pointer-events-none"
                                            style={{
                                              backgroundImage: 'repeating-linear-gradient(45deg, #eab308 0, #eab308 2px, transparent 0, transparent 6px)',
                                              backgroundSize: '6px 6px'
                                            }}
                                          ></div>
                                          <Footprints className="w-2.5 h-2.5 text-amber-400 z-10 shrink-0" />
                                          <span className="text-[7px] font-mono font-black text-amber-300 z-10 [writing-mode:vertical-lr] rotate-180 uppercase tracking-widest">
                                            {(walkwayWidthM * 1000).toFixed(0)}mm
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleToggleWalkwayCol(block.endCol)}
                                            className="px-0.5 py-0.2 rounded bg-rose-500/80 hover:bg-rose-500 text-white text-[6.5px] font-mono cursor-pointer transition-all z-10 shrink-0 leading-none"
                                            title="Remove walkway"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Horizontal Scroll Helper Bar for wide arrays */}
            {matrixCols >= 8 && (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <span className="p-1 rounded bg-amber-500/10 border border-amber-500/30">↔️</span>
                  <span>{t.scrollHintDiagram.replace('{cols}', String(matrixCols))}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Ratio: {panelAspectRatio.toFixed(2)} : 1 &middot; {diagramScaleMode.toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* 4. BILL OF QUANTITIES & QUOTATION (ပစ္စည်းတန်ဖိုးနှင့် ကုန်ကျစရိတ် စာရင်း) */}
      {/* ========================================================================= */}
      <div id="roof-boq-section" className={`rounded-2xl border ${sCard} overflow-hidden transition-all duration-200 scroll-mt-20`}>
        {/* Section 4 Header */}
        <div 
          onClick={() => setIsBoqExpanded(!isBoqExpanded)}
          className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${sCardHeader} cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-all select-none`}
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white leading-snug">
                <span>{t.section4Title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-500 font-black">
                  BOQ
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {lang === 'my' 
                  ? 'ပစ္စည်းစာရင်းနှင့် ကုန်ကျစရိတ် (BOQ) ကို ဖွင့်ကြည့်ရန်/ခေါက်သိမ်းရန် Down Arrow ကို နှိပ်ပါ'
                  : 'Click to expand/collapse detailed Bill of Quantities & material pricing breakdown'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Total Price Summary */}
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block leading-none">{lang === 'my' ? 'ကျသင့်ငွေ စုစုပေါင်း' : 'Grand Total'}</span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                {grandTotalKs.toLocaleString()} MMK
              </span>
            </div>

            {/* Expand / Collapse Button with Down Arrow */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBoqExpanded(!isBoqExpanded);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-orange-600 dark:text-orange-400 border border-orange-500/40 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
              title={isBoqExpanded ? "Collapse BOQ" : "Expand BOQ"}
            >
              <span>
                {isBoqExpanded 
                  ? (lang === 'my' ? 'ခေါက်သိမ်းမည်' : 'Collapse') 
                  : (lang === 'my' ? 'အသေးစိတ်ဖွင့်မည် (Expand BOQ)' : 'Expand BOQ')}
              </span>
              {isBoqExpanded ? (
                <ChevronUp className="w-4 h-4 text-orange-500 transition-transform duration-200" />
              ) : (
                <ChevronDown className="w-4 h-4 text-orange-500 animate-bounce" />
              )}
            </button>

            {/* Reset Prices Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleResetPrices();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${sBtnSecondary} transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 shrink-0`}
              title="Reset prices to standard default rates"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetPrices}</span>
            </button>
          </div>
        </div>

        {/* Collapsed State Quick Preview Banner with Clickable Down Arrow */}
        {!isBoqExpanded && (
          <div 
            onClick={() => setIsBoqExpanded(true)}
            className="px-5 py-3.5 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-t border-orange-500/20 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-orange-500/15 transition-all select-none group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {lang === 'my' 
                    ? '👉 ဆိုလာတပ်ဆင်ပစ္စည်း စာရင်းများနှင့် ဈေးနှုန်း (BOQ) ကို အသေးစိတ်ကြည့်ရန် Down Arrow (Expand BOQ) ကို နှိပ်ပါ' 
                    : '👉 Click here or Down Arrow to expand complete Bill of Quantities (BOQ) & pricing breakdown'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {boqItems.length} items &middot; Total: {grandTotalKs.toLocaleString()} MMK
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md group-hover:scale-105 transition-transform">
              <span>{lang === 'my' ? 'အသေးစိတ်ဖွင့်မည် (Expand BOQ)' : 'Expand BOQ'}</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </span>
          </div>
        )}

        {isBoqExpanded && (
        <div className="p-4 sm:p-6 space-y-5 border-t border-slate-200 dark:border-slate-800">
          {/* Customer & Project Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.customerName}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t.customerPlaceholder}
                className={`w-full h-10 px-3 rounded-xl text-xs sm:text-sm border ${sInput}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.projectName}
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t.projectPlaceholder}
                className={`w-full h-10 px-3 rounded-xl text-xs sm:text-sm border ${sInput}`}
              />
            </div>
          </div>

          {/* BOQ TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">{t.tableItemName}</th>
                  <th className="py-3 px-4 hidden md:table-cell">{t.tableSpecs}</th>
                  <th className="py-3 px-4 text-center">{t.tableQty}</th>
                  <th className="py-3 px-4 text-right">{t.tablePrice}</th>
                  <th className="py-3 px-4 text-right">{t.tableTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {boqItems.map((item) => {
                  const displayName = lang === 'en' ? item.nameEn || item.nameMy : lang === 'zh' ? item.nameZh || item.nameMy : item.nameMy;
                  const displayDesc = lang === 'en' ? item.descriptionEn || item.descriptionMy : lang === 'zh' ? item.descriptionZh || item.descriptionMy : item.descriptionMy;
                  const displayUnit = lang === 'en' ? item.unitEn || item.unitMy : lang === 'zh' ? item.unitZh || item.unitMy : item.unitMy;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      {/* Item Name & Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {displayDesc}
                        </div>
                      </td>

                      {/* Specs */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {item.specs}
                      </td>

                      {/* Qty */}
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className="text-blue-600 dark:text-blue-400 text-sm">{item.quantity}</span>
                        <span className="text-xs text-slate-400 ml-1">{displayUnit}</span>
                      </td>

                      {/* Unit Price (Editable) */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            step="100"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setCustomPrices(prev => ({
                                ...prev,
                                [item.id]: val
                              }));
                            }}
                            className={`w-24 h-8 px-2 text-right font-mono font-bold text-xs sm:text-sm rounded border ${sInput}`}
                          />
                          <span className="text-xs text-slate-400 font-mono">Ks</span>
                        </div>
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                        {item.totalPrice.toLocaleString()} Ks
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-bold text-slate-600 dark:text-slate-400">{t.subtotalPrice}</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{subtotalKs.toLocaleString()} MMK</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">{t.discountLabel}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className={`w-14 h-7 text-center font-mono font-bold text-xs rounded border ${sInput}`}
                />
                <span className="font-bold text-slate-400">%</span>
              </div>
              <span className="font-mono font-bold text-rose-500">-{discountKs.toLocaleString()} MMK</span>
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between pt-3 border-t-2 border-slate-200 dark:border-slate-800">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>{t.grandTotal}</span>
              </span>
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {grandTotalKs.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1">MMK</span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Viber/Telegram Copy, Print/PDF, CSV Export) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {/* Telegram / Viber Copy */}
            <button
              type="button"
              onClick={handleCopyQuotationText}
              className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{t.copyQuotationBtn}</span>
            </button>

            {/* Print / PDF Export */}
            <button
              type="button"
              onClick={handlePrintQuotation}
              className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printQuotationBtn}</span>
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className={`w-full sm:w-auto h-11 px-4 rounded-xl border ${sBtnSecondary} font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0`}
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>{t.downloadCsvBtn}</span>
            </button>
          </div>
        </div>
        )}
      </div>


      {/* ========================================================================= */}
      {/* 5. PRECAUTIONS & TECHNICAL BEST PRACTICES (သတိပြုရန် အချက်များနှင့် နည်းပညာ အကြံပြုချက်များ) */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border ${sCard} overflow-hidden transition-all duration-200`}>
        {/* Section 5 Header */}
        <div className={`p-4 sm:p-5 flex items-center gap-3 ${sCardHeader}`}>
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0 shadow-sm">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
              <span>{t.section5Title}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.section5Desc}
            </p>
          </div>
        </div>

        {/* 4 Precautions Cards */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Bolt Torque */}
          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0 mt-0.5">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t.torqueTitle}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {t.torqueDesc}
              </p>
            </div>
          </div>

          {/* 2. Overhang Limit */}
          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t.overhangTitle}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {t.overhangDesc}
              </p>
            </div>
          </div>

          {/* 3. Thermal Expansion */}
          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 shrink-0 mt-0.5">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t.thermalTitle}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {t.thermalDesc}
              </p>
            </div>
          </div>

          {/* 4. Grounding & Lightning */}
          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t.groundingTitle}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {t.groundingBestPracticeDesc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. SOLAR PANEL DATABASE MODAL & CUSTOM PANEL MANAGER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showPanelDbModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{t.modalTitle}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        {allDatabasePanels.length} {t.panelsUnit}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.modalSub}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowPanelDbModal(false);
                    setShowAddPanelForm(false);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Subheader: Search & Add New Button */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={panelDbSearchQuery}
                    onChange={(e) => setPanelDbSearchQuery(e.target.value)}
                    className={`w-full h-10 pl-9 pr-3 rounded-xl text-xs sm:text-sm border ${sInput}`}
                  />
                  {panelDbSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPanelDbSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Add New Panel Button */}
                <button
                  type="button"
                  onClick={() => setShowAddPanelForm(!showAddPanelForm)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    showAddPanelForm
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  }`}
                >
                  {showAddPanelForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {showAddPanelForm
                      ? lang === 'en' ? 'Close Form' : lang === 'zh' ? '关闭表单' : 'ထည့်သွင်းမှု ပိတ်မည်'
                      : lang === 'en' ? '+ Add New Panel' : lang === 'zh' ? '+ 添加自定义组件' : '+ ဆိုလာပြားအသစ် ထည့်သွင်းမည်'}
                  </span>
                </button>
              </div>

              {/* Modal Body: Add Panel Form & Panels List */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* ADD NEW PANEL FORM (Collapsible) */}
                <AnimatePresence>
                  {showAddPanelForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 rounded-2xl border bg-amber-500/5 border-amber-500/30 space-y-4 mb-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <Plus className="w-4 h-4" />
                            <span>ဆိုလာပြား အချက်အလက်နှင့် အတိုင်းအတာများ အသစ်ထည့်သွင်းမည်</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">Cloud Database Sync</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Name */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              အမှတ်တံဆိပ် / မော်ဒယ် အမည် *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Jinko Tiger Neo 585W N-Type"
                              value={newPanelForm.name}
                              onChange={(e) => setNewPanelForm(prev => ({ ...prev, name: e.target.value }))}
                              className={`w-full h-10 px-3 rounded-lg text-xs sm:text-sm font-bold border ${sInput}`}
                            />
                          </div>

                          {/* Watt */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              ပါဝါ (WATTS - W) *
                            </label>
                            <input
                              type="number"
                              placeholder="585"
                              value={newPanelForm.watt}
                              onChange={(e) => setNewPanelForm(prev => ({ ...prev, watt: parseInt(e.target.value) || 0 }))}
                              className={`w-full h-10 px-3 rounded-lg text-xs sm:text-sm font-mono font-bold border ${sInput}`}
                            />
                          </div>

                          {/* Thickness */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              အထူ (THICKNESS - MM) *
                            </label>
                            <select
                              value={newPanelForm.thickness}
                              onChange={(e) => setNewPanelForm(prev => ({ ...prev, thickness: parseInt(e.target.value) || 30 }))}
                              className={`w-full h-10 px-3 rounded-lg text-xs sm:text-sm font-bold border ${sInput}`}
                            >
                              <option value={30}>30 mm (Modern N-Type)</option>
                              <option value={35}>35 mm (Heavy Duty Standard)</option>
                              <option value={40}>40 mm (Heavy Frame)</option>
                              <option value={28}>28 mm (Slim Frame)</option>
                            </select>
                          </div>

                          {/* Length in mm */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              အလျား (LENGTH - MM) *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="2278"
                                value={newPanelForm.lengthMm}
                                onChange={(e) => setNewPanelForm(prev => ({ ...prev, lengthMm: parseInt(e.target.value) || 0 }))}
                                className={`w-full h-10 px-3 pr-9 rounded-lg text-xs sm:text-sm font-mono font-bold border ${sInput}`}
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">mm</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              = {(newPanelForm.lengthMm / 1000).toFixed(3)} m
                            </span>
                          </div>

                          {/* Width in mm */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              အကျယ် (WIDTH - MM) *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="1134"
                                value={newPanelForm.widthMm}
                                onChange={(e) => setNewPanelForm(prev => ({ ...prev, widthMm: parseInt(e.target.value) || 0 }))}
                                className={`w-full h-10 px-3 pr-9 rounded-lg text-xs sm:text-sm font-mono font-bold border ${sInput}`}
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">mm</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              = {(newPanelForm.widthMm / 1000).toFixed(3)} m
                            </span>
                          </div>

                          {/* Voc */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Open Circuit Voc (V)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="51.9"
                              value={newPanelForm.voc}
                              onChange={(e) => setNewPanelForm(prev => ({ ...prev, voc: parseFloat(e.target.value) || 0 }))}
                              className={`w-full h-10 px-3 rounded-lg text-xs sm:text-sm font-mono font-bold border ${sInput}`}
                            />
                          </div>

                          {/* Vmp */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Max Power Vmp (V)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="43.8"
                              value={newPanelForm.vmp}
                              onChange={(e) => setNewPanelForm(prev => ({ ...prev, vmp: parseFloat(e.target.value) || 0 }))}
                              className={`w-full h-10 px-3 rounded-lg text-xs sm:text-sm font-mono font-bold border ${sInput}`}
                            />
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
                          <button
                            type="button"
                            onClick={() => setShowAddPanelForm(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            မသိမ်းပါ
                          </button>
                          <button
                            type="button"
                            onClick={handleSavePanelToDatabase}
                            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                          >
                            💾 ဒေတာဘေ့စ်တွင် သိမ်းဆည်းမည်
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PANELS DATABASE LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allDatabasePanels
                    .filter(p => {
                      if (!panelDbSearchQuery.trim()) return true;
                      const q = panelDbSearchQuery.toLowerCase();
                      return p.name.toLowerCase().includes(q) || String(p.watt).includes(q);
                    })
                    .map((panel, idx) => {
                      const isSelected = selectedPresetId === panel.id;
                      const isCustom = customPanels?.some(cp => cp.id === panel.id);
                      const lengthMm = Math.round((panel.length ?? 2.278) * 1000);
                      const widthMm = Math.round((panel.width ?? 1.134) * 1000);
                      const thicknessMm = panel.thickness ?? 30;
                      const areaM2 = ((panel.length ?? 2.278) * (panel.width ?? 1.134)).toFixed(2);

                      return (
                        <div
                          key={`smc_panel_item_${panel.id}_${idx}`}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                          }`}
                        >
                          <div>
                            {/* Panel Header */}
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {panel.name}
                                </h5>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                    isCustom
                                      ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  }`}>
                                    {isCustom ? '⭐ မိမိသိမ်းဆည်းမှု (Custom DB)' : 'စနစ်မူရင်း (Default)'}
                                  </span>
                                  <span className="text-[11px] font-mono font-black text-amber-500">
                                    {panel.watt} W
                                  </span>
                                </div>
                              </div>

                              {/* Delete button if custom */}
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustomPanel(panel.id, e)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                                  title="ဒေတာဘေ့စ်မှ ဖျက်မည်"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Dimension Grid */}
                            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 text-center font-mono mt-2">
                              <div>
                                <span className="text-[9px] text-slate-400 block">အလျား</span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {lengthMm} mm
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block">အကျယ်</span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {widthMm} mm
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block">အထူ</span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {thicknessMm} mm
                                </span>
                              </div>
                            </div>

                            {/* Electrical Specs */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-2 px-1">
                              <span>ဧရိယာ: <strong>{areaM2} m²</strong></span>
                              {panel.voc && <span>Voc: <strong>{panel.voc}V</strong></span>}
                              {panel.vmp && <span>Vmp: <strong>{panel.vmp}V</strong></span>}
                            </div>
                          </div>

                          {/* Select Button */}
                          <button
                            type="button"
                            onClick={() => handleSelectDatabasePanel(panel)}
                            className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/20 hover:text-amber-500'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                            <span>
                              {isSelected
                                ? lang === 'en' ? '✓ Currently Selected' : lang === 'zh' ? '✓ 已选择并应用' : '✓ ရွေးချယ်အသုံးပြုထားပါသည်'
                                : lang === 'en' ? 'Select & Apply' : lang === 'zh' ? '选择并应用' : 'ရွေးချယ်မည် (Select & Apply)'}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between shrink-0">
                <span className="text-xs font-mono text-slate-500">
                  {lang === 'en'
                    ? `Total ${allDatabasePanels.length} models available`
                    : lang === 'zh'
                    ? `共计 ${allDatabasePanels.length} 款标准与自定义型号`
                    : `စုစုပေါင်း ${allDatabasePanels.length} မျိုး မှ ရွေးချယ်နိုင်ပါသည်`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPanelDbModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  {lang === 'en' ? 'Close' : lang === 'zh' ? '关闭' : 'ပိတ်မည် (Close)'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Solar Mounting BOQ & Quotation Print / PDF Modal */}
      <SolarMountingPrintModal
        isOpen={showPrintQuotationModal}
        onClose={() => setShowPrintQuotationModal(false)}
        lang={lang}
        projectName={projectName}
        customerName={customerName}
        boqItems={boqItems}
        grandTotalKs={grandTotalKs}
        totalPanels={totalPanels}
        numRows={matrixRows}
        numCols={matrixCols}
        orientation={globalOrientation}
        panelWatt={panelWatt}
        panelBrand={allDatabasePanels.find(p => p.id === selectedPresetId)?.name?.split(' ')[0] || 'Tier-1'}
        panelModel={allDatabasePanels.find(p => p.id === selectedPresetId)?.name || `Mono ${panelWatt}W`}
        roofType={roofMountType}
      />

    </div>
  );
};

function SlidersHorizontalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  );
}

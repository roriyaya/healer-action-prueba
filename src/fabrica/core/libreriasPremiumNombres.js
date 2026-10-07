// 💎 [LIBRERÍAS PREMIUM 2026-08-16] SOLO los nombres, sin importar ninguna librería — a propósito.
//
// Por qué existe separado de "libreriasPremium.js": el backend (server.js) necesita saber CÓMO SE
// LLAMAN estas librerías para detectar si un molde generado las usa de verdad y marcarlo como
// premium. Pero "libreriasPremium.js" importa lucide-react y motion/react a nivel de módulo — son
// librerías de navegador; arrastrarlas al proceso de Node solo para leer dos strings sería pesado
// e innecesario (y "motion/react" ni siquiera está pensado para correr fuera del navegador).
//
// La alternativa sería escribir la lista de nombres dos veces (una en el front, otra en el back),
// que es exactamente el patrón de drift silencioso ya documentado varias veces en las lecciones
// del core (categoría "export_codigo_duplicado_desincronizado"): alguien agrega una librería en un
// lado, se olvida del otro, y la detección deja de marcar moldes premium sin que nada falle a la
// vista. Con este archivo hay UNA sola lista, y los dos lados la leen.
//
// ⚠️ Estos nombres son los identificadores REALES que la IA escribe dentro del código de un molde
// ("Iconos.ShoppingCart", "Animacion.motion.div"). Cambiar uno rompe todos los moldes premium ya
// generados que lo usen — tratarlos como contrato público, no como un detalle interno.
export const NOMBRES_LIBRERIAS_PREMIUM = ['Iconos', 'Animacion', 'Graficos'];

// 📊 Piezas de recharts que se exponen. Set acotado por el mismo criterio que los íconos: recharts
// exporta decenas de componentes (radar, treemap, sankey, brush...) que un panel de app casi nunca
// necesita, y cada uno suma peso. Con estos se arman los 4 gráficos que cubren el 95% de los casos
// reales: líneas (evolución en el tiempo), barras (comparar categorías), torta (composición) y
// área (acumulado). "ResponsiveContainer" es OBLIGATORIO envolviendo a cualquiera de ellos — sin
// él, recharts necesita alto/ancho fijos en píxeles, que es justo lo que el contrato de altura de
// MEITI prohíbe.
export const NOMBRES_GRAFICOS_PREMIUM = [
  'ResponsiveContainer',
  'LineChart', 'Line', 'BarChart', 'Bar', 'PieChart', 'Pie', 'Cell', 'AreaChart', 'Area',
  'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'Legend'
];

// 🎨 Los íconos disponibles, por el mismo motivo: el prompt de la Forja (oraculo.js, backend)
// tiene que PUBLICARLE esta lista a la IA para que elija de acá y no invente un nombre que no
// existe ("Iconos.Cart" en vez de "Iconos.ShoppingCart") — un ícono inventado deja el molde roto
// en tiempo de ejecución, sin error de sintaxis que lo delate antes.
// El set es CURADO a propósito (lucide exporta 5.594 símbolos): importar todos inflaba el bundle
// del sandbox a 297 kB gzip, en el camino crítico de cada render. Ver el comentario de peso en
// libreriasPremium.js.
// ⚠️ Para sumar un ícono hay que tocar DOS archivos: agregarlo acá Y al import/objeto de
// libreriasPremium.js. Si se desincronizan, ese archivo lo avisa por consola al cargar.
export const NOMBRES_ICONOS_PREMIUM = [
  'Home', 'LayoutDashboard', 'LayoutGrid', 'Menu', 'Search', 'Settings', 'Sliders', 'PanelLeft', 'Rows3', 'Columns3',
  'ChevronLeft', 'ChevronRight', 'ChevronUp', 'ChevronDown', 'ChevronsUpDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ExternalLink',
  'Link', 'Link2', 'MoveRight', 'CornerDownRight', 'MoreHorizontal', 'MoreVertical', 'Maximize2', 'Minimize2', 'Plus', 'PlusCircle',
  'Minus', 'Pencil', 'PencilLine', 'SquarePen', 'Trash', 'Trash2', 'Save', 'Check', 'CheckCheck', 'X',
  'Copy', 'ClipboardCopy', 'Share2', 'Download', 'Upload', 'RefreshCw', 'RotateCcw', 'Undo2', 'Redo2', 'Filter',
  'ArrowUpDown', 'ListFilter', 'Send', 'Eye', 'EyeOff', 'Archive', 'ArchiveRestore', 'Ban', 'CircleSlash', 'CircleCheck',
  'CircleCheckBig', 'CircleAlert', 'TriangleAlert', 'CircleX', 'Info', 'CircleHelp', 'Clock', 'Loader', 'LoaderCircle', 'Hourglass',
  'BellRing', 'Bell', 'BellOff', 'Star', 'StarHalf', 'Heart', 'ThumbsUp', 'ThumbsDown', 'Flame', 'Sparkles',
  'Wallet', 'DollarSign', 'Euro', 'CreditCard', 'Receipt', 'ReceiptText', 'Banknote', 'Coins', 'PiggyBank', 'Calculator',
  'TrendingUp', 'TrendingDown', 'ChartColumn', 'ChartColumnIncreasing', 'ChartPie', 'ChartLine', 'ChartNoAxesColumn', 'Percent', 'HandCoins', 'Landmark',
  'ShoppingCart', 'ShoppingBag', 'ShoppingBasket', 'Package', 'PackageOpen', 'PackageCheck', 'Boxes', 'Box', 'Tag', 'Tags',
  'Truck', 'Store', 'Barcode', 'QrCode', 'Scan', 'Warehouse', 'Container', 'Forklift', 'ListChecks', 'ListTodo',
  'List', 'SquareCheck', 'SquareCheckBig', 'Calendar', 'CalendarDays', 'CalendarCheck', 'CalendarClock', 'CalendarPlus', 'Timer', 'TimerReset',
  'AlarmClock', 'Flag', 'Target', 'Bookmark', 'ClipboardList', 'ClipboardCheck', 'NotebookPen', 'StickyNote', 'Kanban', 'Workflow',
  'GitBranch', 'Milestone', 'CircleDot', 'Mail', 'MailOpen', 'MessageSquare', 'MessageCircle', 'MessagesSquare', 'Phone', 'PhoneCall',
  'Video', 'Mic', 'MicOff', 'Bot', 'AtSign', 'Megaphone', 'Rss', 'Reply', 'Forward', 'Inbox',
  'File', 'FileText', 'FilePlus', 'FileCheck', 'FileSpreadsheet', 'FileImage', 'Files', 'Folder', 'FolderOpen', 'FolderPlus',
  'Image', 'Images', 'Paperclip', 'Camera', 'Printer', 'ScanLine', 'BookMarked', 'User', 'Users', 'UserPlus',
  'UserCheck', 'UserMinus', 'UserCog', 'CircleUser', 'Contact', 'IdCard', 'Baby', 'PersonStanding', 'LogOut', 'LogIn',
  'Smile', 'Frown', 'Meh', 'Building', 'Building2', 'Briefcase', 'MapPin', 'Map', 'Globe', 'Navigation',
  'Compass', 'Route', 'House', 'Hotel', 'Church', 'School', 'Activity', 'HeartPulse', 'Stethoscope', 'Dumbbell',
  'Utensils', 'UtensilsCrossed', 'Apple', 'Pill', 'Syringe', 'Bandage', 'Brain', 'Bed', 'Footprints', 'Moon',
  'Sun', 'Droplet', 'Thermometer', 'Scale', 'Salad', 'Coffee', 'CupSoda', 'Beef', 'CloudSun', 'Cloud',
  'CloudRain', 'CloudSnow', 'Wind', 'Snowflake', 'Umbrella', 'Sprout', 'TreePine', 'Leaf', 'Flower2', 'Bug',
  'Cpu', 'Zap', 'ZapOff', 'Power', 'PowerOff', 'Wifi', 'WifiOff', 'Bluetooth', 'Radio', 'Antenna',
  'Cable', 'Plug', 'PlugZap', 'Database', 'Server', 'HardDrive', 'Wrench', 'Cog', 'Settings2', 'Gauge',
  'Lightbulb', 'Factory', 'Cctv', 'CircuitBoard', 'ToggleLeft', 'ToggleRight', 'SlidersHorizontal', 'Fuel', 'Battery', 'BatteryCharging',
  'Recycle', 'Waves', 'Magnet', 'Ruler', 'GraduationCap', 'BookOpen', 'BookOpenCheck', 'Book', 'Library', 'Award',
  'Trophy', 'Medal', 'Crown', 'Gift', 'PartyPopper', 'Puzzle', 'Blocks', 'Music', 'Music2', 'Play',
  'Pause', 'SkipForward', 'SkipBack', 'Volume2', 'VolumeX', 'Headphones', 'Film', 'Clapperboard', 'ListVideo', 'Gamepad2', 'Dices',
  'Ticket', 'Palette', 'Brush', 'PenTool', 'Lock', 'LockOpen', 'Unlock', 'Shield', 'ShieldCheck', 'ShieldAlert',
  'KeyRound', 'Key', 'Fingerprint', 'ScanFace', 'Car', 'Bike', 'Bus', 'Plane', 'Train', 'Ship',
  'Rocket', 'Anchor', 'CalendarRange', 'History', 'Repeat', 'Shuffle', 'Layers', 'Grid3x3', 'Hash', 'Type',
  'Text', 'AlignLeft', 'Quote', 'Table', 'TableProperties', 'Binary', 'Terminal', 'Code', 'Braces', 'TestTube',
  'FlaskConical', 'Microscope', 'Scissors', 'Hammer', 'Paintbrush', 'Shirt', 'Watch', 'Glasses', 'Backpack', 'Luggage',
  'Wine', 'Pizza', 'Cake', 'IceCream', 'PawPrint', 'Dog', 'Cat', 'Fish', 'Bird', 'Tractor',
  'Wheat'
];

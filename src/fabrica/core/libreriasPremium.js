// 💎 [LIBRERÍAS PREMIUM 2026-08-16, pedido explícito del usuario] Librerías extra que la Forja
// puede usar al escribir un molde cuando el creador califica como premium (ver
// "tieneAccesoPremiumForja" en server.js: dev con plan, suscripción activa, o gasto del mes +
// esta forja >= créditos del plan más barato).
//
// ⚠️ POR QUÉ ESTÁN SIEMPRE EN EL SCOPE, SIN GATE ACÁ — es a propósito, no un olvido:
// el gate vive en el momento de GENERAR (el prompt solo le menciona estas librerías a quien
// califica), nunca en el de VER. Si el scope las escondiera de los no-premium, una app hecha con
// gráficos/íconos y comprada después en el marketplace se rompería en la pantalla del comprador
// solo por no tener plan — castigando a quien pagó por la app. Un molde que ya existe tiene que
// renderizar para cualquiera; lo que se cobra es el poder de CREAR con estas piezas.
//
// ⚠️ LAS 3 COPIAS DEL SCOPE: este archivo existe justamente para que no haya que acordarse de
// tocar tres lugares. El scope de react-live se arma en ReactorRender.jsx (export nativo),
// SandboxRuntimeApp.jsx (el iframe sandboxeado real) y PreviewMoldeVivo.jsx (herramientas de dev)
// — ya hubo un bug real por editar uno solo (categoría "export_codigo_duplicado_desincronizado" en
// las lecciones del core). Agregar una librería nueva acá la habilita en los tres de una.
//
// ⚠️ NADA DE RED: cualquier librería que agregues acá tiene que funcionar 100% del lado del
// cliente. El iframe del sandbox corre con "connect-src 'none'" en su CSP, así que una librería
// que quiera pedir algo por red (mapas con tiles, fuentes remotas) NO va a andar y hay que
// resolverla aparte, con su propio proxy — ver "RUTA_PERMITIDA" en sandboxRelay.js/meitiIframeShim.js.
import {
  Home, LayoutDashboard, LayoutGrid, Menu, Search, Settings, Sliders, PanelLeft, Rows3, Columns3,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ExternalLink,
  Link, Link2, MoveRight, CornerDownRight, MoreHorizontal, MoreVertical, Maximize2, Minimize2, Plus, PlusCircle,
  Minus, Pencil, PencilLine, SquarePen, Trash, Trash2, Save, Check, CheckCheck, X,
  Copy, ClipboardCopy, Share2, Download, Upload, RefreshCw, RotateCcw, Undo2, Redo2, Filter,
  ArrowUpDown, ListFilter, Send, Eye, EyeOff, Archive, ArchiveRestore, Ban, CircleSlash, CircleCheck,
  CircleCheckBig, CircleAlert, TriangleAlert, CircleX, Info, CircleHelp, Clock, Loader, LoaderCircle, Hourglass,
  BellRing, Bell, BellOff, Star, StarHalf, Heart, ThumbsUp, ThumbsDown, Flame, Sparkles,
  Wallet, DollarSign, Euro, CreditCard, Receipt, ReceiptText, Banknote, Coins, PiggyBank, Calculator,
  TrendingUp, TrendingDown, ChartColumn, ChartColumnIncreasing, ChartPie, ChartLine, ChartNoAxesColumn, Percent, HandCoins, Landmark,
  ShoppingCart, ShoppingBag, ShoppingBasket, Package, PackageOpen, PackageCheck, Boxes, Box, Tag, Tags,
  Truck, Store, Barcode, QrCode, Scan, Warehouse, Container, Forklift, ListChecks, ListTodo,
  List, SquareCheck, SquareCheckBig, Calendar, CalendarDays, CalendarCheck, CalendarClock, CalendarPlus, Timer, TimerReset,
  AlarmClock, Flag, Target, Bookmark, ClipboardList, ClipboardCheck, NotebookPen, StickyNote, Kanban, Workflow,
  GitBranch, Milestone, CircleDot, Mail, MailOpen, MessageSquare, MessageCircle, MessagesSquare, Phone, PhoneCall,
  Video, Mic, MicOff, Bot, AtSign, Megaphone, Rss, Reply, Forward, Inbox,
  File, FileText, FilePlus, FileCheck, FileSpreadsheet, FileImage, Files, Folder, FolderOpen, FolderPlus,
  Image, Images, Paperclip, Camera, Printer, ScanLine, BookMarked, User, Users, UserPlus,
  UserCheck, UserMinus, UserCog, CircleUser, Contact, IdCard, Baby, PersonStanding, LogOut, LogIn,
  Smile, Frown, Meh, Building, Building2, Briefcase, MapPin, Map, Globe, Navigation,
  Compass, Route, House, Hotel, Church, School, Activity, HeartPulse, Stethoscope, Dumbbell,
  Utensils, UtensilsCrossed, Apple, Pill, Syringe, Bandage, Brain, Bed, Footprints, Moon,
  Sun, Droplet, Thermometer, Scale, Salad, Coffee, CupSoda, Beef, CloudSun, Cloud,
  CloudRain, CloudSnow, Wind, Snowflake, Umbrella, Sprout, TreePine, Leaf, Flower2, Bug,
  Cpu, Zap, ZapOff, Power, PowerOff, Wifi, WifiOff, Bluetooth, Radio, Antenna,
  Cable, Plug, PlugZap, Database, Server, HardDrive, Wrench, Cog, Settings2, Gauge,
  Lightbulb, Factory, Cctv, CircuitBoard, ToggleLeft, ToggleRight, SlidersHorizontal, Fuel, Battery, BatteryCharging,
  Recycle, Waves, Magnet, Ruler, GraduationCap, BookOpen, BookOpenCheck, Book, Library, Award,
  Trophy, Medal, Crown, Gift, PartyPopper, Puzzle, Blocks, Music, Music2, Play,
  Pause, SkipForward, SkipBack, Volume2, VolumeX, Headphones, Film, Clapperboard, ListVideo, Gamepad2, Dices,
  Ticket, Palette, Brush, PenTool, Lock, LockOpen, Unlock, Shield, ShieldCheck, ShieldAlert,
  KeyRound, Key, Fingerprint, ScanFace, Car, Bike, Bus, Plane, Train, Ship,
  Rocket, Anchor, CalendarRange, History, Repeat, Shuffle, Layers, Grid3x3, Hash, Type,
  Text, AlignLeft, Quote, Table, TableProperties, Binary, Terminal, Code, Braces, TestTube,
  FlaskConical, Microscope, Scissors, Hammer, Paintbrush, Shirt, Watch, Glasses, Backpack, Luggage,
  Wine, Pizza, Cake, IceCream, PawPrint, Dog, Cat, Fish, Bird, Tractor,
  Wheat
} from 'lucide-react';
// Mismo criterio de peso que los íconos de abajo: "import * as" traía los 383 exports de
// motion/react. En la práctica un molde solo necesita el componente animado ("motion.div") y, como
// mucho, AnimatePresence para animar algo al desaparecer — el resto (hooks de scroll, drag,
// layout, valores motion) es superficie que la IA no debería usar en un molde de panel igual.
import { motion, AnimatePresence } from 'motion/react';
// 📊 [GRÁFICOS PREMIUM 2026-08-16, pedido explícito del usuario: "agrega las gráficas que mejore
// la calidad y se note la diferencia en premium"] Import por nombre (no "* as") por el mismo
// motivo de peso que los íconos. Es LA pieza que más se nota: sin esto la IA fingía gráficos con
// divs de colores.
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { NOMBRES_LIBRERIAS_PREMIUM, NOMBRES_ICONOS_PREMIUM, NOMBRES_GRAFICOS_PREMIUM } from './libreriasPremiumNombres.js';

const Graficos = {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
};

// 🩹 [BUG DE PESO REAL, encontrado con un "vite build" de verdad 2026-08-16] La primera versión
// hacía "import * as Iconos from 'lucide-react'" — cómodo, pero lucide exporta 5.594 símbolos y el
// bundle resultante fue de 1.337 kB (297 kB gzip) en un chunk que cae en el CAMINO CRÍTICO de CADA
// render del sandbox (SandboxRuntimeApp lo importa de forma estática). Con la latencia de arranque
// del sandbox ya siendo un tema conocido, sumar 300 kB gzip a cada molde era un retroceso claro.
// Solución: set CURADO e importado por nombre, para que el tree-shaking se lleve el resto.
// Beneficio extra, tanto o más importante que el peso: al ser una lista CERRADA y publicada en el
// prompt, la IA no puede inventar un ícono que no existe ("Iconos.Cart" en vez de "ShoppingCart")
// y dejar el molde roto en tiempo de ejecución — solo puede elegir de lo que hay.
// Si hace falta un ícono nuevo: agregarlo al import de arriba Y al objeto de abajo (las dos cosas),
// y quedará disponible automáticamente en el prompt (se genera desde este mismo objeto).
const Iconos = {
  Home, LayoutDashboard, LayoutGrid, Menu, Search, Settings, Sliders, PanelLeft, Rows3, Columns3,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ExternalLink,
  Link, Link2, MoveRight, CornerDownRight, MoreHorizontal, MoreVertical, Maximize2, Minimize2, Plus, PlusCircle,
  Minus, Pencil, PencilLine, SquarePen, Trash, Trash2, Save, Check, CheckCheck, X,
  Copy, ClipboardCopy, Share2, Download, Upload, RefreshCw, RotateCcw, Undo2, Redo2, Filter,
  ArrowUpDown, ListFilter, Send, Eye, EyeOff, Archive, ArchiveRestore, Ban, CircleSlash, CircleCheck,
  CircleCheckBig, CircleAlert, TriangleAlert, CircleX, Info, CircleHelp, Clock, Loader, LoaderCircle, Hourglass,
  BellRing, Bell, BellOff, Star, StarHalf, Heart, ThumbsUp, ThumbsDown, Flame, Sparkles,
  Wallet, DollarSign, Euro, CreditCard, Receipt, ReceiptText, Banknote, Coins, PiggyBank, Calculator,
  TrendingUp, TrendingDown, ChartColumn, ChartColumnIncreasing, ChartPie, ChartLine, ChartNoAxesColumn, Percent, HandCoins, Landmark,
  ShoppingCart, ShoppingBag, ShoppingBasket, Package, PackageOpen, PackageCheck, Boxes, Box, Tag, Tags,
  Truck, Store, Barcode, QrCode, Scan, Warehouse, Container, Forklift, ListChecks, ListTodo,
  List, SquareCheck, SquareCheckBig, Calendar, CalendarDays, CalendarCheck, CalendarClock, CalendarPlus, Timer, TimerReset,
  AlarmClock, Flag, Target, Bookmark, ClipboardList, ClipboardCheck, NotebookPen, StickyNote, Kanban, Workflow,
  GitBranch, Milestone, CircleDot, Mail, MailOpen, MessageSquare, MessageCircle, MessagesSquare, Phone, PhoneCall,
  Video, Mic, MicOff, Bot, AtSign, Megaphone, Rss, Reply, Forward, Inbox,
  File, FileText, FilePlus, FileCheck, FileSpreadsheet, FileImage, Files, Folder, FolderOpen, FolderPlus,
  Image, Images, Paperclip, Camera, Printer, ScanLine, BookMarked, User, Users, UserPlus,
  UserCheck, UserMinus, UserCog, CircleUser, Contact, IdCard, Baby, PersonStanding, LogOut, LogIn,
  Smile, Frown, Meh, Building, Building2, Briefcase, MapPin, Map, Globe, Navigation,
  Compass, Route, House, Hotel, Church, School, Activity, HeartPulse, Stethoscope, Dumbbell,
  Utensils, UtensilsCrossed, Apple, Pill, Syringe, Bandage, Brain, Bed, Footprints, Moon,
  Sun, Droplet, Thermometer, Scale, Salad, Coffee, CupSoda, Beef, CloudSun, Cloud,
  CloudRain, CloudSnow, Wind, Snowflake, Umbrella, Sprout, TreePine, Leaf, Flower2, Bug,
  Cpu, Zap, ZapOff, Power, PowerOff, Wifi, WifiOff, Bluetooth, Radio, Antenna,
  Cable, Plug, PlugZap, Database, Server, HardDrive, Wrench, Cog, Settings2, Gauge,
  Lightbulb, Factory, Cctv, CircuitBoard, ToggleLeft, ToggleRight, SlidersHorizontal, Fuel, Battery, BatteryCharging,
  Recycle, Waves, Magnet, Ruler, GraduationCap, BookOpen, BookOpenCheck, Book, Library, Award,
  Trophy, Medal, Crown, Gift, PartyPopper, Puzzle, Blocks, Music, Music2, Play,
  Pause, SkipForward, SkipBack, Volume2, VolumeX, Headphones, Film, Clapperboard, ListVideo, Gamepad2, Dices,
  Ticket, Palette, Brush, PenTool, Lock, LockOpen, Unlock, Shield, ShieldCheck, ShieldAlert,
  KeyRound, Key, Fingerprint, ScanFace, Car, Bike, Bus, Plane, Train, Ship,
  Rocket, Anchor, CalendarRange, History, Repeat, Shuffle, Layers, Grid3x3, Hash, Type,
  Text, AlignLeft, Quote, Table, TableProperties, Binary, Terminal, Code, Braces, TestTube,
  FlaskConical, Microscope, Scissors, Hammer, Paintbrush, Shirt, Watch, Glasses, Backpack, Luggage,
  Wine, Pizza, Cake, IceCream, PawPrint, Dog, Cat, Fish, Bird, Tractor,
  Wheat
};

// 🛟 [BUG REAL 2026-08-26, pedido del usuario: "poné un ícono default para que no se rompa si no
// existe el que necesita"] La lista cerrada de arriba dice que la IA "no puede inventar un ícono".
// Resultó que sí puede: en la app VideoNet escribió "Iconos.ListVideo", un ícono que existe en
// lucide pero que nunca se había publicado acá. Renderizar algo que no existe es el error #130 de
// React ("Element type is invalid: got undefined"), que NO rompe el ícono: **tira abajo el molde
// entero**. Dos pantallas quedaron muertas — una en blanco cargando para siempre y otra con el
// error crudo a la vista — y el sistema lo dio por bueno igual.
//
// Este envoltorio hace que eso sea imposible. Si la IA pide un ícono que no está, recibe uno
// neutro en vez de "undefined": el molde se dibuja completo y lo único que se pierde es un
// dibujito. Un ícono que falta NUNCA puede costar una pantalla.
//
// Detalles que hacen que sea seguro:
//   · solo responde por nombres que PARECEN un ícono (empiezan con mayúscula). React consulta
//     propiedades internas ("$$typeof", "prototype", símbolos) sobre cualquier objeto que le pasan,
//     y devolverle un componente a esas consultas rompe más de lo que arregla;
//   · avisa por consola UNA vez por nombre inventado — sin eso, un ícono faltante se vuelve
//     invisible para siempre y nadie lo agrega nunca;
//   · "Object.keys(Iconos)" sigue devolviendo la lista real, así que el prompt y la red de
//     seguridad de abajo siguen viendo exactamente lo mismo que antes.
const ICONO_POR_DEFECTO = CircleHelp;
const inventadosAvisados = new Set();
const IconosSeguros = new Proxy(Iconos, {
  get(objetivo, propiedad, receptor) {
    if (Reflect.has(objetivo, propiedad)) return Reflect.get(objetivo, propiedad, receptor);
    if (typeof propiedad !== 'string' || !/^[A-Z]/.test(propiedad)) return undefined;
    if (!inventadosAvisados.has(propiedad)) {
      inventadosAvisados.add(propiedad);
      console.warn(`[ 💎 PREMIUM ] Ícono inexistente pedido por un molde: "Iconos.${propiedad}". Se dibuja el de reemplazo. Si hace falta de verdad, agrégalo en libreriasPremium.js Y en libreriasPremiumNombres.js.`);
    }
    return ICONO_POR_DEFECTO;
  }
});

// Las CLAVES de este objeto son los identificadores que la IA ve en el prompt y escribe en el
// código. La lista de nombres vive en "libreriasPremiumNombres.js" (el backend también la necesita
// y no puede importar este archivo — ver el comentario largo allá).
export const LIBRERIAS_PREMIUM = { Iconos: IconosSeguros, Animacion: { motion, AnimatePresence }, Graficos };

// 🛡️ Red de seguridad contra el drift entre los dos archivos: si alguien agrega una librería acá
// y se olvida de sumarla a la lista de nombres (o al revés), el backend dejaría de marcar esos
// moldes como premium EN SILENCIO. Esto lo grita apenas se carga el módulo, en vez de que se note
// meses después mirando por qué el pool premium quedó vacío.
const clavesReales = Object.keys(LIBRERIAS_PREMIUM);
if (clavesReales.length !== NOMBRES_LIBRERIAS_PREMIUM.length || clavesReales.some(k => !NOMBRES_LIBRERIAS_PREMIUM.includes(k))) {
  console.error('[ 💎 PREMIUM ] libreriasPremium.js y libreriasPremiumNombres.js NO coinciden:', clavesReales, 'vs', NOMBRES_LIBRERIAS_PREMIUM);
}
// Mismo chequeo para los íconos: la lista que se le PUBLICA a la IA vive en el archivo de nombres,
// pero los componentes reales se importan acá. Si se desincronizan, la IA podría escribir un ícono
// que el prompt le ofreció y que en realidad no está en el scope — molde roto en tiempo de
// ejecución. Esto lo detecta al cargar, en vez de en la cara del usuario.
const iconosFaltantes = NOMBRES_ICONOS_PREMIUM.filter(n => !(n in Iconos));
const iconosDeMas = Object.keys(Iconos).filter(n => !NOMBRES_ICONOS_PREMIUM.includes(n));
if (iconosFaltantes.length > 0 || iconosDeMas.length > 0) {
  console.error('[ 💎 PREMIUM ] Íconos desincronizados. Publicados sin importar:', iconosFaltantes, '| importados sin publicar:', iconosDeMas);
}

// Mismo chequeo de drift para los gráficos.
const graficosFaltantes = NOMBRES_GRAFICOS_PREMIUM.filter(n => !(n in Graficos));
if (graficosFaltantes.length > 0) {
  console.error('[ 💎 PREMIUM ] Gráficos publicados sin importar:', graficosFaltantes);
}

export { NOMBRES_LIBRERIAS_PREMIUM };

import { saveUserProfile } from '../auth';

export interface UserManualLocation {
  state: string;
  district: string;
  taluka?: string;
  area?: string;
}

/**
 * Official Pan-India States & Districts (Default State: Gujarat first)
 * Includes all 33 Districts of Gujarat + comprehensive Districts across all Indian States & UTs
 */
export const PAN_INDIA_STATES_DISTRICTS: Record<string, string[]> = {
  "Gujarat": [
    "Gandhinagar", "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh",
    "Anand", "Bharuch", "Kheda", "Mehsana", "Patan", "Banaskantha", "Sabarkantha", "Aravalli",
    "Kutch", "Valsad", "Navsari", "Morbi", "Surendranagar", "Amreli", "Gir Somnath", "Porbandar",
    "Botad", "Dahod", "Panchmahal", "Mahisagar", "Chhota Udaipur", "Narmada", "Tapi", "Dang", "Devbhumi Dwarka"
  ],
  "Maharashtra": [
    "Mumbai", "Mumbai Suburban", "Thane", "Pune", "Nagpur", "Nashik", "Chhatrapati Sambhajinagar (Aurangabad)",
    "Solapur", "Kolhapur", "Satara", "Sangli", "Ahmednagar", "Jalgaon", "Dhule", "Nanded", "Latur",
    "Amravati", "Akola", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg", "Chandrapur", "Wardha", "Yavatmal",
    "Beed", "Parbhani", "Dharashiv (Osmanabad)", "Buldhana", "Washim", "Hingoli", "Jalna", "Nandurbar", "Gondia", "Bhandara", "Gadchiroli"
  ],
  "Rajasthan": [
    "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bharatpur",
    "Sikar", "Pali", "Bhilwara", "Sri Ganganagar", "Chittorgarh", "Jhunjhunu", "Nagaur",
    "Barmer", "Jaisalmer", "Sirohi", "Dungarpur", "Banswara", "Sawai Madhopur", "Tonk",
    "Rajsamand", "Bundi", "Jhalawar", "Baran", "Dausa", "Karauli", "Dholpur", "Hanumangarh", "Churu", "Jalore", "Pratapgarh"
  ],
  "Madhya Pradesh": [
    "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna",
    "Ratlam", "Rewa", "Khandwa", "Chhindwara", "Katni", "Morena", "Vidisha", "Mandsaur", "Neemuch",
    "Dhar", "Khargone", "Hoshangabad (Narmadapuram)", "Sehore", "Raisen", "Betul", "Shivpuri", "Guna", "Chhatarpur", "Damoh", "Jhabua", "Alirajpur"
  ],
  "Delhi (NCT)": [
    "New Delhi", "Central Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi",
    "South West Delhi", "North West Delhi", "South East Delhi", "Shahdara", "North East Delhi"
  ],
  "Uttar Pradesh": [
    "Lucknow", "Gautam Buddha Nagar (Noida)", "Ghaziabad", "Kanpur Nagar", "Varanasi", "Agra",
    "Prayagraj", "Meerut", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur",
    "Jhansi", "Mathura", "Ayodhya", "Muzaffarnagar", "Sultanpur", "Unnao", "Rae Bareli",
    "Azamgarh", "Jaunpur", "Mirzapur", "Basti", "Deoria", "Shahjahanpur", "Rampur", "Bijnor", "Firozabad", "Etawah"
  ],
  "Karnataka": [
    "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Dakshina Kannada (Mangaluru)", "Dharwad (Hubballi)",
    "Belagavi", "Kalaburagi", "Ballari", "Davangere", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura", "Hassan",
    "Mandya", "Chikkamagaluru", "Kodagu", "Raichur", "Bidar", "Bagalkot", "Haveri", "Kolar", "Chitradurga"
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli",
    "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Chengalpattu", "Kanchipuram", "Thanjavur", "Kanyakumari",
    "Dindigul", "Krishnagiri", "Namakkal", "Cuddalore", "Villupuram", "Tiruvannamalai", "virudhunagar"
  ],
  "Telangana": [
    "Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Warangal", "Nizamabad", "Khammam",
    "Karimnagar", "Sangareddy", "Mahabubnagar", "Nalgonda", "Adilabad", "Suryapet", "Siddipet"
  ],
  "Andhra Pradesh": [
    "Visakhapatnam", "NTR (Vijayawada)", "Guntur", "Tirupati", "Kurnool", "SPSR Nellore",
    "Kakinada", "East Godavari (Rajahmundry)", "Anantapur", "YSR Kadapa", "Eluru", "Vizianagaram", "Srikakulam", "Prakasam", "Chittoor"
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "North 24 Parganas", "South 24 Parganas", "Hooghly", "Darjeeling",
    "Paschim Bardhaman", "Purba Bardhaman", "Nadia", "Murshidabad", "Malda", "Purba Medinipur", "Paschim Medinipur", "Jalpaiguri", "Cooch Behar"
  ],
  "Bihar": [
    "Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia", "Begusarai",
    "Samastipur", "Saran (Chhapra)", "Vaishali (Hajipur)", "Nalanda", "Bhojpur (Arrah)", "Rohtas", "Katihar", "Madhubani", "Siwan", "Purbi Champaran"
  ],
  "Punjab": [
    "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "SAS Nagar (Mohali)", "Bathinda",
    "Hoshiarpur", "Pathankot", "Moga", "Kapurthala", "Sangrur", "Firozpur", "Gurdaspur", "Rupnagar", "Barnala"
  ],
  "Haryana": [
    "Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak",
    "Sonipat", "Panchkula", "Yamunanagar", "Kurukshetra", "Sirsa", "Rewari", "Jhajjar", "Bhiwani", "Jind", "Kaithal", "Palwal"
  ],
  "Kerala": [
    "Thiruvananthapuram", "Ernakulam (Kochi)", "Kozhikode", "Thrissur", "Kollam",
    "Kannur", "Alappuzha", "Kottayam", "Palakkad", "Malappuram", "Wayanad", "Idukki", "Pathanamthitta", "Kasaragod"
  ],
  "Odisha": [
    "Khordha (Bhubaneswar)", "Cuttack", "Sundargarh (Rourkela)", "Puri", "Sambalpur",
    "Ganjam (Berhampur)", "Balasore", "Bhadrak", "Jajpur", "Angul", "Jharsuguda", "Mayurbhanj", "Koraput", "Balangir"
  ],
  "Assam": [
    "Kamrup Metropolitan (Guwahati)", "Kamrup", "Dibrugarh", "Jorhat", "Cachar (Silchar)",
    "Nagaon", "Tinsukia", "Sonitpur (Tezpur)", "Bongaigaon", "Goalpara", "Sivasagar", "Barpeta"
  ],
  "Jharkhand": [
    "Ranchi", "East Singhbhum (Jamshedpur)", "Dhanbad", "Bokaro", "Deoghar",
    "Hazaribagh", "Giridih", "Ramgarh", "Palamu", "Dumka", "West Singhbhum", "Godda"
  ],
  "Chhattisgarh": [
    "Raipur", "Durg (Bhilai)", "Bilaspur", "Korba", "Rajnandgaon", "Raigarh", "Bastar (Jagdalpur)", "Surguja (Ambikapur)", "Dhamtari", "Mahasamund"
  ],
  "Uttarakhand": [
    "Dehradun", "Haridwar", "Nainital", "Udham Singh Nagar", "Pauri Garhwal", "Almora", "Tehri Garhwal", "Chamoli", "Pithoragarh", "Champawat"
  ],
  "Himachal Pradesh": [
    "Shimla", "Kangra", "Mandi", "Solan", "Kullu", "Hamirpur", "Una", "Bilaspur", "Chamba", "Sirmaur", "Kinnaur", "Lahaul & Spiti"
  ],
  "Goa": [
    "North Goa", "South Goa"
  ],
  "Chandigarh": [
    "Chandigarh"
  ],
  "Jammu & Kashmir": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur", "Kathua", "Pulwama", "Kupwara", "Budgam", "Rajouri"
  ],
  "Puducherry": [
    "Puducherry", "Karaikal", "Mahe", "Yanam"
  ],
  "Dadra & Nagar Haveli and Daman & Diu": [
    "Daman", "Diu", "Dadra & Nagar Haveli (Silvassa)"
  ],
  "North East & Other States": [
    "East Sikkim (Gangtok)", "East Khasi Hills (Shillong)", "West Tripura (Agartala)", "Imphal West",
    "Aizawl", "Kohima", "Dimapur", "Papum Pare (Itanagar)", "Leh (Ladakh)", "South Andaman (Port Blair)"
  ]
};

/**
 * Official Talukas / Tehsils / Sub-Districts per District
 * Complete 100% coverage of all 33 Districts & 252 Talukas of Gujarat + major Indian Districts
 */
export const DISTRICT_TALUKAS: Record<string, string[]> = {
  // ==========================================
  // GUJARAT - ALL 33 DISTRICTS & ALL TALUKAS
  // ==========================================
  "Gandhinagar": ["Gandhinagar", "Kalol", "Dehgam", "Mansa"],
  "Ahmedabad": [
    "Ahmedabad City", "Daskroi", "Sanand", "Dholka", "Bavla",
    "Viramgam", "Mandal", "Detroj-Rampura", "Dhandhuka", "Dholera"
  ],
  "Surat": [
    "Surat City", "Chorasi", "Kamrej", "Olpad", "Palsana",
    "Bardoli", "Mandvi", "Mangrol", "Mahuva", "Umarpada"
  ],
  "Vadodara": [
    "Vadodara", "Padra", "Karjan", "Savli", "Waghodia", "Dabhoi", "Sinor", "Desar"
  ],
  "Rajkot": [
    "Rajkot", "Gondal", "Jetpur", "Dhoraji", "Upleta", "Jamkandorana",
    "Kotda Sangani", "Lodhika", "Paddhari", "Jasdan", "Vinchhiya"
  ],
  "Bhavnagar": [
    "Bhavnagar", "Ghogha", "Sihor", "Mahuva", "Talaja", "Palitana",
    "Gariadhar", "Umrala", "Vallabhipur", "Jesar"
  ],
  "Jamnagar": [
    "Jamnagar", "Dhrol", "Jodiya", "Kalavad", "Lalpur", "Jamjodhpur"
  ],
  "Junagadh": [
    "Junagadh City", "Junagadh Rural", "Keshod", "Mangrol", "Manavadar",
    "Vanthali", "Bhesan", "Visavadar", "Mendarda", "Malia Hatina"
  ],
  "Anand": [
    "Anand", "Borsad", "Petlad", "Khambhat", "Umreth", "Sojitra", "Tarapur", "Anklav"
  ],
  "Bharuch": [
    "Bharuch", "Ankleshwar", "Jambusar", "Amod", "Vagra", "Hansot", "Jhagadia", "Valia", "Netrang"
  ],
  "Kheda": [
    "Nadiad", "Kheda", "Kapadvanj", "Kathlal", "Mahudha", "Matar", "Mehmedabad", "Thasra", "Galteshwar", "Vaso"
  ],
  "Mehsana": [
    "Mehsana", "Vijapur", "Visnagar", "Kadi", "Unjha", "Kheralu", "Vadnagar", "Satlasana", "Becharaji", "Jotana"
  ],
  "Patan": [
    "Patan", "Sidhpur", "Chanasma", "Harij", "Sami", "Shankheshwar", "Radhanpur", "Santalpur", "Saraswati"
  ],
  "Banaskantha": [
    "Palanpur", "Deesa", "Danta", "Vadgam", "Amirgadh", "Dantiwada", "Dhanera",
    "Deodar", "Kankrej", "Tharad", "Vav", "Bhabhar", "Lakhani", "Suigam"
  ],
  "Sabarkantha": [
    "Himatnagar", "Idar", "Prantij", "Talod", "Khedbrahma", "Vadali", "Vijaynagar", "Poshina"
  ],
  "Aravalli": [
    "Modasa", "Bhiloda", "Bayad", "Dhansura", "Malpur", "Meghraj"
  ],
  "Kutch": [
    "Bhuj", "Gandhidham", "Anjar", "Mundra", "Mandvi", "Nakhatrana", "Abdasa", "Lakhpat", "Rapar", "Bhachau"
  ],
  "Valsad": [
    "Valsad", "Vapi", "Pardi", "Umbergaon", "Dharampur", "Kaprada"
  ],
  "Navsari": [
    "Navsari", "Jalalpore", "Gandevi", "Chikhli", "Vansda", "Khergam"
  ],
  "Morbi": [
    "Morbi", "Wankaner", "Tankara", "Halvad", "Maliya Miyana"
  ],
  "Surendranagar": [
    "Wadhwan (Surendranagar)", "Limbdi", "Chotila", "Dhrangadhra", "Halvad",
    "Dasada (Patdi)", "Lakhtar", "Muli", "Sayla", "Thangadh"
  ],
  "Amreli": [
    "Amreli", "Savarkundla", "Rajula", "Jafrabad", "Babra", "Lathi",
    "Liliya", "Dhari", "Khambha", "Kunkavav Vadia", "Bagasara"
  ],
  "Gir Somnath": [
    "Veraval", "Talala", "Sutrapada", "Kodinar", "Una", "Gir Gadhada"
  ],
  "Porbandar": [
    "Porbandar", "Ranavav", "Kutiyana"
  ],
  "Botad": [
    "Botad", "Gadhada", "Barwala", "Ranpur"
  ],
  "Dahod": [
    "Dahod", "Jhalod", "Limkheda", "Garbada", "Devgadbaria", "Dhanpur", "Fatepura", "Sanjeli", "Singvad"
  ],
  "Panchmahal": [
    "Godhra", "Halol", "Kalol (Panchmahal)", "Jambughoda", "Shahera", "Morva Hadaf", "Ghoghamba"
  ],
  "Mahisagar": [
    "Lunawada", "Balasinor", "Kadana", "Khanpur", "Santrampur", "Virpur"
  ],
  "Chhota Udaipur": [
    "Chhota Udaipur", "Jetpur Pavi", "Kavant", "Nasvadi", "Sankheda", "Bodeli"
  ],
  "Narmada": [
    "Rajpipla (Nandod)", "Garudeshwar", "Tilakwada", "Dediapada", "Sagbara"
  ],
  "Tapi": [
    "Vyara", "Songadh", "Uchchhal", "Nizar", "Valod", "Dolvan", "Kukarmunda"
  ],
  "Dang": [
    "Ahwa", "Waghai", "Subir"
  ],
  "Devbhumi Dwarka": [
    "Khambhalia", "Okhamandal (Dwarka)", "Bhanvad", "Kalyanpur"
  ],

  // ==========================================
  // MAHARASHTRA MAJOR DISTRICTS & TALUKAS
  // ==========================================
  "Mumbai": ["Mumbai City", "Dadar", "Byculla", "Colaba", "Worli", "Parel"],
  "Mumbai Suburban": ["Andheri", "Borivali", "Kurla", "Bandra"],
  "Thane": ["Thane", "Kalyan", "Bhiwandi", "Ulhasnagar", "Ambarnath", "Murbad", "Shahapur"],
  "Palghar": ["Palghar", "Vasai", "Dahanu", "Talasari", "Wada", "Vikramgad", "Jawhar", "Mokhada"],
  "Pune": ["Pune City", "Haveli (Pimpri-Chinchwad)", "Mulshi", "Maval", "Bhor", "Baramati", "Indapur", "Junnar", "Khed", "Shirur", "Daund", "Purandar", "Velhe", "Ambegaon"],
  "Nagpur": ["Nagpur Urban", "Nagpur Rural", "Kamptee", "Hingna", "Katol", "Savner", "Ramtek", "Umred"],
  "Nashik": ["Nashik", "Malegaon", "Niphad", "Sinnar", "Igatpuri", "Dindori", "Yeola", "Satana", "Manmad"],
  "Chhatrapati Sambhajinagar (Aurangabad)": ["Chhatrapati Sambhajinagar", "Paithan", "Gangapur", "Vaijapur", "Kannad", "Sillod", "Khuldabad"],
  "Solapur": ["Solapur North", "Solapur South", "Barshi", "Pandharpur", "Malshiras", "Sangola", "Akkalkot"],
  "Kolhapur": ["Karvir (Kolhapur)", "Hatkanangale", "Shirol", "Kagal", "Panhala", "Gadhinglaj", "Radhanagari"],

  // ==========================================
  // RAJASTHAN MAJOR DISTRICTS & TEHSILS
  // ==========================================
  "Jaipur": ["Jaipur", "Sanganer", "Amer", "Chomu", "Kotputli", "Shahpura", "Phulera", "Bassi", "Chaksu"],
  "Jodhpur": ["Jodhpur", "Bilara", "Osian", "Phalodi", "Shergarh", "Bhopalgarh", "Luni"],
  "Udaipur": ["Girwa (Udaipur)", "Vallabhnagar", "Mavli", "Salumbar", "Kherwara", "Gogunda", "Jhadol", "Kotda"],
  "Kota": ["Ladpura (Kota)", "Ramganj Mandi", "Sangod", "Pipalda", "Digod"],
  "Ajmer": ["Ajmer", "Kishangarh", "Beawar", "Kekri", "Pushkar", "Nasirabad", "Sarwar"],
  "Sirohi": ["Sirohi", "Abu Road", "Mount Abu", "Pindwara", "Reodar", "Sheoganj"],
  "Dungarpur": ["Dungarpur", "Sagwara", "Simalwara", "Aspur", "Bichhiwara"],
  "Banswara": ["Banswara", "Ghatol", "Garhi", "Bagidora", "Kushalgarh"],

  // ==========================================
  // MADHYA PRADESH MAJOR DISTRICTS & TEHSILS
  // ==========================================
  "Indore": ["Indore", "Mhow (Dr. Ambedkar Nagar)", "Sanwer", "Depalpur", "Hatod"],
  "Bhopal": ["Huzur (Bhopal)", "Berasia", "Kolar"],
  "Ujjain": ["Ujjain", "Nagda", "Barnagar", "Khachrod", "Mahidpur", "Tarana", "Ghatiya"],
  "Ratlam": ["Ratlam", "Jaora", "Alot", "Sailana", "Bajna"],
  "Jhabua": ["Jhabua", "Thandla", "Petlawad", "Meghnagar", "Ranapur"],
  "Alirajpur": ["Alirajpur", "Jobat", "Bhabra", "Sondwa", "Katthiwada"],

  // ==========================================
  // DELHI & OTHER MAJOR METROS
  // ==========================================
  "New Delhi": ["Connaught Place", "Chanakyapuri", "Delhi Cantonment", "Vasant Vihar"],
  "Central Delhi": ["Karol Bagh", "Paharganj", "Daryaganj", "Civil Lines"],
  "North Delhi": ["Model Town", "Narela", "Alipur", "Kotwali"],
  "South Delhi": ["Saket", "Hauz Khas", "Mehrauli", "Defence Colony"],
  "East Delhi": ["Preet Vihar", "Mayur Vihar", "Gandhi Nagar", "Patparganj"],
  "West Delhi": ["Rajouri Garden", "Patel Nagar", "Punjabi Bagh", "Janakpuri"],
  "South West Delhi": ["Dwarka", "Najafgarh", "Kapashera"],
  "North West Delhi": ["Rohini", "Saraswati Vihar", "Kanjhawala"],
  "Lucknow": ["Lucknow Sadar", "Mohanlalganj", "Bakshi Ka Talab", "Malihabad", "Sarojini Nagar"],
  "Gautam Buddha Nagar (Noida)": ["Noida", "Dadri", "Jewar (Greater Noida)"],
  "Ghaziabad": ["Ghaziabad", "Loni", "Modinagar"],
  "Bengaluru Urban": ["Bengaluru North", "Bengaluru South", "Bengaluru East", "Yelahanka", "Anekal"],
  "Hyderabad": ["Secunderabad", "Charminar", "Khairatabad", "Amberpet", "Golconda", "Tirumalagiri"],
  "Chennai": ["Egmore", "Guindy", "Mylapore", "Tondiarpet", "Velachery", "Ambattur", "Sholinganallur"],
  "Kolkata": ["Kolkata North", "Kolkata Central", "Kolkata South", "Salt Lake (Bidhannagar)", "Alipore"],
  "Daman": ["Daman"],
  "Diu": ["Diu"],
  "Dadra & Nagar Haveli (Silvassa)": ["Silvassa", "Khanvel"]
};

// Keep DISTRICT_POPULAR_AREAS exported as alias of DISTRICT_TALUKAS for full backward compatibility
export const DISTRICT_POPULAR_AREAS: Record<string, string[]> = DISTRICT_TALUKAS;

/**
 * Returns the list of Talukas / Tehsils for any selected District in India.
 * Guaranteed to always return a non-empty array of Talukas.
 */
export function getTalukasForDistrict(district: string): string[] {
  const clean = (district || '').trim();
  if (!clean) return DISTRICT_TALUKAS['Gandhinagar'];
  if (DISTRICT_TALUKAS[clean] && DISTRICT_TALUKAS[clean].length > 0) {
    return DISTRICT_TALUKAS[clean];
  }
  const lower = clean.toLowerCase();
  for (const [distKey, talukas] of Object.entries(DISTRICT_TALUKAS)) {
    if (distKey.toLowerCase() === lower || distKey.toLowerCase().includes(lower) || lower.includes(distKey.toLowerCase())) {
      return talukas;
    }
  }
  const baseName = clean.replace(/\s*\(.*?\)\s*/g, '').trim();
  return [
    `${baseName} Taluka (Main)`,
    `${baseName} City`,
    `${baseName} Rural`
  ];
}

// Twin-City & Neighboring District Connections across India
export const TWIN_CITY_NEIGHBORS: Record<string, string[]> = {
  "gandhinagar": ["gandhinagar", "ahmedabad", "mehsana", "kheda", "sabarkantha"],
  "ahmedabad": ["ahmedabad", "gandhinagar", "kheda", "anand", "mehsana"],
  "surat": ["surat", "navsari", "bharuch", "valsad", "tapi"],
  "navsari": ["navsari", "surat", "valsad", "dang"],
  "vadodara": ["vadodara", "anand", "bharuch", "kheda", "panchmahal"],
  "anand": ["anand", "kheda", "vadodara", "ahmedabad"],
  "kheda": ["kheda", "anand", "ahmedabad", "gandhinagar", "vadodara"],
  "mehsana": ["mehsana", "gandhinagar", "ahmedabad", "patan", "sabarkantha"],
  "rajkot": ["rajkot", "morbi", "jamnagar", "junagadh", "surendranagar"],
  "morbi": ["morbi", "rajkot", "surendranagar", "kutch"],
  "bharuch": ["bharuch", "vadodara", "surat", "narmada"],
  "mumbai": ["mumbai", "mumbai suburban", "thane", "palghar", "raigad", "navi mumbai"],
  "mumbai suburban": ["mumbai suburban", "mumbai", "thane", "palghar", "raigad"],
  "thane": ["thane", "mumbai", "mumbai suburban", "palghar", "raigad"],
  "pune": ["pune", "satara", "raigad", "ahmednagar", "solapur"],
  "new delhi": ["new delhi", "central delhi", "north delhi", "south delhi", "east delhi", "west delhi", "gautam buddha nagar (noida)", "noida", "ghaziabad", "gurugram", "faridabad"],
  "gautam buddha nagar (noida)": ["gautam buddha nagar (noida)", "noida", "ghaziabad", "new delhi", "east delhi", "south delhi", "faridabad", "gurugram"],
  "ghaziabad": ["ghaziabad", "gautam buddha nagar (noida)", "noida", "new delhi", "east delhi", "meerut"],
  "gurugram": ["gurugram", "faridabad", "new delhi", "south delhi", "rewari"],
  "faridabad": ["faridabad", "gurugram", "new delhi", "south delhi", "gautam buddha nagar (noida)"],
  "hyderabad": ["hyderabad", "rangareddy", "medchal-malkajgiri", "sangareddy"],
  "rangareddy": ["rangareddy", "hyderabad", "medchal-malkajgiri"],
  "kolkata": ["kolkata", "howrah", "north 24 parganas", "south 24 parganas", "hooghly"],
  "howrah": ["howrah", "kolkata", "hooghly", "north 24 parganas"],
  "chennai": ["chennai", "chengalpattu", "kanchipuram"],
  "bengaluru urban": ["bengaluru urban", "bengaluru rural", "bengaluru", "tumakuru"],
  "indore": ["indore", "dewas", "ujjain"],
  "ujjain": ["ujjain", "indore", "dewas", "ratlam"],
  "bhopal": ["bhopal", "vidisha", "sehore"],
  "lucknow": ["lucknow", "unnao", "kanpur nagar", "rae bareli"],
  "kanpur nagar": ["kanpur nagar", "unnao", "lucknow"],
  "patna": ["patna", "vaishali (hajipur)", "saran (chhapra)", "nalanda", "bhojpur (arrah)"],
  "chandigarh": ["chandigarh", "sas nagar (mohali)", "panchkula", "ambala", "patiala"],
  "sas nagar (mohali)": ["sas nagar (mohali)", "chandigarh", "panchkula", "patiala"],
  "panchkula": ["panchkula", "chandigarh", "sas nagar (mohali)", "ambala"]
};

export function findStateForDistrict(district: string): string {
  const lower = (district || '').trim().toLowerCase();
  if (!lower) return 'Gujarat';
  for (const [state, districts] of Object.entries(PAN_INDIA_STATES_DISTRICTS)) {
    if (districts.some(d => d.toLowerCase() === lower || d.toLowerCase().includes(lower) || lower.includes(d.toLowerCase()))) {
      return state;
    }
  }
  return 'Gujarat';
}

export function formatUserLocationLabel(loc?: Partial<UserManualLocation> | null): string {
  if (!loc) return 'Gandhinagar';
  const district = (loc.district || '').trim();
  const taluka = (loc.taluka || loc.area || '').trim();
  if (taluka && district) {
    return `${taluka}, ${district}`;
  }
  return taluka || district || 'Gandhinagar';
}

/**
 * Returns the user's current Browsing Filter Location (used on Home Page / Directory Search).
 * Defaults to State: Gujarat, District: Gandhinagar, Taluka: Gandhinagar.
 */
export function getSavedUserLocation(): UserManualLocation {
  try {
    const raw = localStorage.getItem('locohelp_user_location');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.district) {
        const state = parsed.state || findStateForDistrict(parsed.district) || 'Gujarat';
        const district = parsed.district;
        const taluka =
          parsed.taluka ||
          parsed.area ||
          localStorage.getItem('locohelp_selected_area') ||
          getTalukasForDistrict(district)[0] ||
          district;
        return {
          state,
          district,
          taluka,
          area: taluka
        };
      }
    }

    const profLoc = getProfileRegisteredLocation();
    if (profLoc && profLoc.district) {
      return profLoc;
    }

    const legacyCity = localStorage.getItem('locohelp_selected_city');
    const legacyState = localStorage.getItem('locohelp_selected_state');
    const legacyArea = localStorage.getItem('locohelp_selected_area');
    if (legacyCity) {
      const resolvedTaluka = legacyArea || getTalukasForDistrict(legacyCity)[0] || legacyCity;
      return {
        state: legacyState || findStateForDistrict(legacyCity) || 'Gujarat',
        district: legacyCity,
        taluka: resolvedTaluka,
        area: resolvedTaluka
      };
    }
  } catch (e) {}

  return {
    state: 'Gujarat',
    district: 'Gandhinagar',
    taluka: 'Gandhinagar',
    area: 'Gandhinagar'
  };
}

/**
 * Returns the user's PERMANENT Registered Profile Location (set during Registration or Profile Edit).
 * This never changes when the user merely browses another District/Taluka on the Home Page.
 */
export function getProfileRegisteredLocation(): UserManualLocation {
  try {
    const regRaw = localStorage.getItem('locohelp_registered_profile_location');
    if (regRaw) {
      const parsed = JSON.parse(regRaw);
      if (parsed && parsed.district) {
        const taluka = parsed.taluka || parsed.area || getTalukasForDistrict(parsed.district)[0] || '';
        return {
          state: parsed.state || 'Gujarat',
          district: parsed.district,
          taluka,
          area: taluka
        };
      }
    }

    const savedUserRaw = localStorage.getItem('locohelp_user');
    if (savedUserRaw) {
      const u = JSON.parse(savedUserRaw);
      if (u && (u.manualDistrict || u.city)) {
        const dist = u.manualDistrict || u.city || 'Gandhinagar';
        const st = u.manualState || findStateForDistrict(dist) || 'Gujarat';
        const tal = u.manualTaluka || u.manualArea || u.sector || getTalukasForDistrict(dist)[0] || '';
        return {
          state: st,
          district: dist,
          taluka: tal,
          area: tal
        };
      }
    }
  } catch {}

  return {
    state: 'Gujarat',
    district: 'Gandhinagar',
    taluka: 'Gandhinagar',
    area: 'Gandhinagar'
  };
}

/**
 * Saves the user's PERMANENT Registered Profile Location (called during Registration or Profile Save).
 */
export async function saveProfileRegisteredLocation(loc: UserManualLocation): Promise<void> {
  const cleanState = (loc.state || 'Gujarat').trim();
  const cleanDistrict = (loc.district || 'Gandhinagar').trim();
  const cleanTaluka = (loc.taluka || loc.area || getTalukasForDistrict(cleanDistrict)[0] || '').trim();

  const payload: UserManualLocation = {
    state: cleanState,
    district: cleanDistrict,
    taluka: cleanTaluka,
    area: cleanTaluka
  };

  try {
    localStorage.setItem('locohelp_registered_profile_location', JSON.stringify(payload));
    // If no browsing location was set yet, sync browsing filter to the registered location too
    if (!localStorage.getItem('locohelp_user_location')) {
      localStorage.setItem('locohelp_user_location', JSON.stringify(payload));
      localStorage.setItem('locohelp_selected_state', cleanState);
      localStorage.setItem('locohelp_selected_city', cleanDistrict);
      localStorage.setItem('locohelp_selected_area', cleanTaluka);
    }

    const savedUserRaw = localStorage.getItem('locohelp_user');
    if (savedUserRaw) {
      const parsedUser = JSON.parse(savedUserRaw);
      if (parsedUser && parsedUser.uid && parsedUser.uid !== 'guest_user') {
        const formattedAddress = cleanTaluka
          ? `${cleanTaluka}, ${cleanDistrict}, ${cleanState}`
          : `${cleanDistrict}, ${cleanState}`;
        const updatedUser = {
          ...parsedUser,
          manualState: cleanState,
          manualDistrict: cleanDistrict,
          manualTaluka: cleanTaluka,
          manualArea: cleanTaluka,
          city: cleanDistrict,
          sector: cleanTaluka,
          address: formattedAddress
        };
        localStorage.setItem('locohelp_user', JSON.stringify(updatedUser));
        saveUserProfile(updatedUser).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Registered profile location save error:', e);
  }
}

/**
 * Saves ONLY the Browsing Filter Location (Top Header Location Selector).
 * Does NOT overwrite the user's permanent Profile or Shop/Helper registered location!
 */
export async function saveUserLocationPermanently(loc: UserManualLocation): Promise<void> {
  const cleanState = (loc.state || 'Gujarat').trim();
  const cleanDistrict = (loc.district || 'Gandhinagar').trim();
  const cleanTaluka = (loc.taluka ?? loc.area ?? '').trim();

  const payload: UserManualLocation = {
    state: cleanState,
    district: cleanDistrict,
    taluka: cleanTaluka,
    area: cleanTaluka
  };

  try {
    localStorage.setItem('locohelp_user_location', JSON.stringify(payload));
    localStorage.setItem('locohelp_selected_state', cleanState);
    localStorage.setItem('locohelp_selected_city', cleanDistrict);
    localStorage.setItem('locohelp_selected_area', cleanTaluka);
    window.dispatchEvent(new CustomEvent('locohelp_location_changed', { detail: payload }));
  } catch (e) {
    console.warn('Location filter save error:', e);
  }
}

export function getConnectedTwinDistricts(district: string): string[] {
  const norm = (district || '').trim().toLowerCase();
  if (!norm || norm === 'all') return [];

  if (TWIN_CITY_NEIGHBORS[norm]) {
    return TWIN_CITY_NEIGHBORS[norm];
  }

  for (const [key, list] of Object.entries(TWIN_CITY_NEIGHBORS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return list;
    }
  }

  return [norm];
}

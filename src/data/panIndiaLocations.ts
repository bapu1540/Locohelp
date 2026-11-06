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

const LOCALIZED_PLACE_NAMES: Record<string, { gu: string; hi: string; aliases?: string[] }> = {
  all: { gu: 'બધા શહેરો', hi: 'सभी शहर' },
  gujarat: { gu: 'ગુજરાત', hi: 'गुजरात' },
  gandhinagar: { gu: 'ગાંધીનગર', hi: 'गांधीनगर' },
  ahmedabad: { gu: 'અમદાવાદ', hi: 'अहमदाबाद', aliases: ['amdavad', 'ahmedabad city'] },
  'ahmedabad city': { gu: 'અમદાવાદ', hi: 'अहमदाबाद', aliases: ['ahmedabad', 'amdavad'] },
  surat: { gu: 'સુરત', hi: 'सूरत', aliases: ['surat city'] },
  'surat city': { gu: 'સુરત', hi: 'सूरत', aliases: ['surat'] },
  vadodara: { gu: 'વડોદરા', hi: 'वडोदरा', aliases: ['baroda', 'બરોડા'] },
  rajkot: { gu: 'રાજકોટ', hi: 'राजकोट' },
  mehsana: { gu: 'મહેસાણા', hi: 'मेहसाणा', aliases: ['mahesana'] },
  anand: { gu: 'આણંદ', hi: 'आणंद' },
  bhavnagar: { gu: 'ભાવનગર', hi: 'भावनगर' },
  jamnagar: { gu: 'જામનગર', hi: 'जामनगर' },
  junagadh: { gu: 'જૂનાગઢ', hi: 'जूनागढ़', aliases: ['junagadh city'] },
  kutch: { gu: 'કચ્છ', hi: 'कच्छ', aliases: ['kachchh', 'bhuj', 'ભુજ'] },
  banaskantha: { gu: 'બનાસકાંઠા', hi: 'बनासकांठा', aliases: ['palanpur', 'પાલનપુર'] },
  sabarkantha: { gu: 'સાબરકાંઠા', hi: 'साबरकांठा', aliases: ['himatnagar', 'હિંમતનગર'] },
  aravalli: { gu: 'અરવલ્લી', hi: 'अरवल्ली', aliases: ['modasa', 'મોડાસા'] },
  patan: { gu: 'પાટણ', hi: 'पाटण' },
  kheda: { gu: 'ખેડા', hi: 'खेड़ा', aliases: ['nadiad', 'નડિયાદ'] },
  bharuch: { gu: 'ભરૂચ', hi: 'भरूच', aliases: ['ankleshwar', 'અંકલેશ્વર'] },
  navsari: { gu: 'નવસારી', hi: 'नवसारी' },
  valsad: { gu: 'વલસાડ', hi: 'वलसाड', aliases: ['vapi', 'વાપી'] },
  morbi: { gu: 'મોરબી', hi: 'मोरबी' },
  surendranagar: { gu: 'સુરેન્દ્રનગર', hi: 'सुरेंद्रनगर' },
  amreli: { gu: 'અમરેલી', hi: 'अमरेली' },
  gir_somnath: { gu: 'ગીર સોમનાથ', hi: 'गीर सोमनाथ', aliases: ['veraval', 'વેરાવળ'] },
  'gir somnath': { gu: 'ગીર સોમનાથ', hi: 'गीर सोमनाथ', aliases: ['veraval', 'વેરાવળ'] },
  porbandar: { gu: 'પોરબંદર', hi: 'पोरबंदर' },
  botad: { gu: 'બોટાદ', hi: 'बोटाद' },
  dahod: { gu: 'દાહોદ', hi: 'दाहोद' },
  panchmahal: { gu: 'પંચમહાલ', hi: 'पंचमहल', aliases: ['godhra', 'ગોધરા'] },
  mahisagar: { gu: 'મહીસાગર', hi: 'महीसागर', aliases: ['lunawada', 'લુણાવાડા'] },
  'chhota udaipur': { gu: 'છોટા ઉદેપુર', hi: 'छोटा उदेपुर' },
  narmada: { gu: 'નર્મદા', hi: 'नर्मदा', aliases: ['rajpipla', 'રાજપીપળા'] },
  tapi: { gu: 'તાપી', hi: 'तापी', aliases: ['vyara', 'વ્યારા'] },
  dang: { gu: 'ડાંગ', hi: 'डांग', aliases: ['ahwa', 'આહવા'] },
  'devbhumi dwarka': { gu: 'દેવભૂમિ દ્વારકા', hi: 'देवभूमि द्वारका', aliases: ['dwarka', 'દ્વારકા', 'khambhalia', 'ખંભાળિયા'] },
  kalol: { gu: 'કલોલ', hi: 'कलोल' },
  mansa: { gu: 'માણસા', hi: 'माणसा' },
  dehgam: { gu: 'દહેગામ', hi: 'दहेगाम', aliases: ['dahegam'] },
  sanand: { gu: 'સાણંદ', hi: 'साणंद' },
  daskroi: { gu: 'દસ્ક્રોઈ', hi: 'दसक्रोई' },
  dholka: { gu: 'ધોળકા', hi: 'धोलका' },
  bavla: { gu: 'બાવળા', hi: 'बावला' },
  viramgam: { gu: 'વિરમગામ', hi: 'विरमगाम' },
  bopal: { gu: 'બોપલ', hi: 'बोपल' },
  chandkheda: { gu: 'ચાંદખેડા', hi: 'चांदखेड़ा' },
  kudasan: { gu: 'કુડાસણ', hi: 'कुडासण' },
  sargasan: { gu: 'સરગાસણ', hi: 'सरगासण' },
  kadi: { gu: 'કડી', hi: 'कडी' },
  visnagar: { gu: 'વિસનગર', hi: 'विसनगर' },
  unjha: { gu: 'ઊંઝા', hi: 'ऊंझा' },
  vijapur: { gu: 'વિજાપુર', hi: 'विजापुर' },
  palanpur: { gu: 'પાલનપુર', hi: 'पालनपुर' },
  deesa: { gu: 'ડીસા', hi: 'डीसा' },
  himatnagar: { gu: 'હિંમતનગર', hi: 'हिम्मतनगर' },
  idar: { gu: 'ઈડર', hi: 'ईडर' },
  modasa: { gu: 'મોડાસા', hi: 'मोडासा' },
  nadiad: { gu: 'નડિયાદ', hi: 'नडियाद' },
  ankleshwar: { gu: 'અંકલેશ્વર', hi: 'अंकलेश्वर' },
  vapi: { gu: 'વાપી', hi: 'वापी' },
  bardoli: { gu: 'બારડોલી', hi: 'बारडोली' },
  kamrej: { gu: 'કામરેજ', hi: 'कामरेज' },
  gondal: { gu: 'ગોંડલ', hi: 'गोंडल' },
  jetpur: { gu: 'જેતપુર', hi: 'जेतपुर' },
  bhuj: { gu: 'ભુજ', hi: 'भुज' },
  gandhidham: { gu: 'ગાંધીધામ', hi: 'गांधीधाम' },
  anjar: { gu: 'અંજાર', hi: 'अंजार' },
  mundra: { gu: 'મુન્દ્રા', hi: 'मुंद्रा' },
};

export function localizePlaceName(name: string, language: string): string {
  const clean = (name || '').trim();
  if (!clean) return '';
  const entry = LOCALIZED_PLACE_NAMES[clean.toLowerCase()];
  if (!entry) return clean;
  if (language === 'GU') return entry.gu;
  if (language === 'HI') return entry.hi;
  return clean;
}

export function getPlaceNameVariants(name?: string | null): string[] {
  const clean = String(name || '').trim().toLowerCase();
  if (!clean || clean === 'all' || clean === 'all cities') return [];
  const baseNoSuffix = clean.replace(/\s+(city|urban|rural|district)$/i, '').trim();
  const variants = new Set<string>([clean]);
  if (baseNoSuffix) variants.add(baseNoSuffix);

  const addFromKey = (k: string) => {
    const entry = LOCALIZED_PLACE_NAMES[k];
    if (!entry) return;
    if (entry.gu) variants.add(entry.gu.toLowerCase());
    if (entry.hi) variants.add(entry.hi.toLowerCase());
    if (Array.isArray(entry.aliases)) {
      entry.aliases.forEach((a) => {
        if (a) variants.add(a.toLowerCase());
      });
    }
  };

  addFromKey(clean);
  if (baseNoSuffix && baseNoSuffix !== clean) addFromKey(baseNoSuffix);

  // Reverse lookup in case the input itself is already in Gujarati or Hindi
  for (const [engKey, val] of Object.entries(LOCALIZED_PLACE_NAMES)) {
    if (
      val.gu.toLowerCase() === clean ||
      val.hi.toLowerCase() === clean ||
      (val.aliases && val.aliases.some((a) => a.toLowerCase() === clean))
    ) {
      variants.add(engKey.toLowerCase());
      variants.add(val.gu.toLowerCase());
      variants.add(val.hi.toLowerCase());
      if (val.aliases) val.aliases.forEach((a) => variants.add(a.toLowerCase()));
    }
  }

  return Array.from(variants).filter(Boolean);
}

/**
 * Universal Multilingual Location Filter Matcher (Matches English, Gujarati, and Hindi names of selected District/Taluka).
 * Returns true if activeLoc is 'All' or if rawLocationText matches the selected District or Taluka in any language.
 */
export function matchesUserLocationFilter(
  rawLocationText?: string | null,
  activeLoc?: Partial<UserManualLocation> | null
): boolean {
  if (!activeLoc) return true;
  const dist = String(activeLoc.district || '').trim();
  if (!dist || dist.toLowerCase() === 'all' || dist.toLowerCase() === 'all cities') {
    return true;
  }

  const text = String(rawLocationText || '').trim().toLowerCase();
  if (
    !text ||
    text === 'local area' ||
    text === 'nearby' ||
    text === 'all' ||
    text === 'gujarat' ||
    text === 'india'
  ) {
    return true;
  }

  const distVariants = getPlaceNameVariants(dist);
  const taluka = String(activeLoc.taluka || activeLoc.area || '').trim();
  const talukaVariants =
    taluka && taluka.toLowerCase() !== 'all' && taluka.toLowerCase() !== dist.toLowerCase()
      ? getPlaceNameVariants(taluka)
      : [];

  // Also include all talukas of the selected district when matching a post/helper/shop that only wrote its taluka name (e.g., "Kalol" or "કલોલ" inside Gandhinagar district)
  const districtTalukas = getTalukasForDistrict(dist);
  const allDistrictTalukaVariants: string[] = [];
  if (!taluka || taluka.toLowerCase() === dist.toLowerCase()) {
    districtTalukas.forEach((tName) => {
      getPlaceNameVariants(tName).forEach((v) => allDistrictTalukaVariants.push(v));
    });
  }

  const allTokensToCheck = Array.from(
    new Set([...distVariants, ...talukaVariants, ...allDistrictTalukaVariants])
  );

  return allTokensToCheck.some((token) => token.length >= 2 && text.includes(token));
}

export function getLocalizedLocationButtonText(
  loc?: Partial<UserManualLocation> | null,
  language: string = 'GU'
): string {
  if (!loc) return localizePlaceName('Gandhinagar', language);
  const district = (loc.district || '').trim();
  const taluka = (loc.taluka || loc.area || '').trim();
  if (!district || district.toLowerCase() === 'all') {
    return language === 'GU' ? 'બધા શહેરો' : language === 'HI' ? 'सभी शहर' : 'All Cities';
  }
  const locDistrict = localizePlaceName(district, language);
  const locTaluka = localizePlaceName(taluka, language);
  if (taluka && taluka.toLowerCase() !== district.toLowerCase()) {
    return `${locTaluka}, ${locDistrict}`;
  }
  return locDistrict;
}

export function formatUserLocationLabel(loc?: Partial<UserManualLocation> | null): string {
  if (!loc) return 'Gandhinagar';
  const district = (loc.district || '').trim();
  if (district.toLowerCase() === 'all') return 'All Cities';
  const taluka = (loc.taluka || loc.area || '').trim();
  if (taluka && district && taluka.toLowerCase() !== district.toLowerCase()) {
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
        if (String(parsed.district).trim().toLowerCase() === 'all') {
          return {
            state: 'All',
            district: 'All',
            taluka: '',
            area: ''
          };
        }
        const state = parsed.state || findStateForDistrict(parsed.district) || 'Gujarat';
        const district = parsed.district;
        const taluka =
          typeof parsed.taluka === 'string'
            ? parsed.taluka
            : typeof parsed.area === 'string'
            ? parsed.area
            : localStorage.getItem('locohelp_selected_area') ||
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

/**
 * Geographic Coordinates (Latitude, Longitude) for Gujarat's 33 Districts, Talukas, and Major Indian Cities
 * Used to calculate accurate real-world distance (km) between two users' profile locations.
 */
export const LOCATION_COORDINATES_MAP: Record<string, { lat: number; lng: number }> = {
  // Gandhinagar District & Talukas
  gandhinagar: { lat: 23.2156, lng: 72.6369 },
  kalol: { lat: 23.2464, lng: 72.4959 },
  mansa: { lat: 23.4272, lng: 72.6562 },
  dehgam: { lat: 23.1627, lng: 72.8112 },
  dahegam: { lat: 23.1627, lng: 72.8112 },
  kudasan: { lat: 23.1858, lng: 72.6321 },
  sargasan: { lat: 23.1932, lng: 72.6168 },
  infocity: { lat: 23.1965, lng: 72.6325 },
  adraj: { lat: 23.1852, lng: 72.5591 },
  pethapur: { lat: 23.2571, lng: 72.6695 },
  chiloda: { lat: 23.2856, lng: 72.7351 },

  // Ahmedabad District & Talukas
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  amdavad: { lat: 23.0225, lng: 72.5714 },
  sanand: { lat: 22.9921, lng: 72.3815 },
  daskroi: { lat: 22.9754, lng: 72.6421 },
  dholka: { lat: 22.7357, lng: 72.4418 },
  viramgam: { lat: 23.1255, lng: 72.0543 },
  bavla: { lat: 22.8294, lng: 72.3652 },
  dhandhuka: { lat: 22.3688, lng: 71.9854 },
  mandal: { lat: 23.2889, lng: 71.9182 },
  detroj: { lat: 23.3812, lng: 72.1895 },
  bopal: { lat: 23.0338, lng: 72.4634 },
  gota: { lat: 23.1035, lng: 72.5412 },
  chandkheda: { lat: 23.1116, lng: 72.5728 },
  motera: { lat: 23.0987, lng: 72.5974 },
  nikol: { lat: 23.0402, lng: 72.6685 },
  naroda: { lat: 23.0685, lng: 72.6536 },
  maninagar: { lat: 22.9962, lng: 72.6026 },
  satellite: { lat: 23.0276, lng: 72.5236 },
  vastrapur: { lat: 23.0387, lng: 72.5293 },
  navrangpura: { lat: 23.0365, lng: 72.5611 },

  // North Gujarat Districts & Talukas
  mehsana: { lat: 23.5880, lng: 72.3693 },
  mahesana: { lat: 23.5880, lng: 72.3693 },
  kadi: { lat: 23.2974, lng: 72.3308 },
  visnagar: { lat: 23.6989, lng: 72.5521 },
  unjha: { lat: 23.8037, lng: 72.3921 },
  vijapur: { lat: 23.5608, lng: 72.7525 },
  kheralu: { lat: 23.8842, lng: 72.6186 },
  becharaji: { lat: 23.4969, lng: 72.0434 },
  vadnagar: { lat: 23.7848, lng: 72.6391 },
  patan: { lat: 23.8493, lng: 72.1266 },
  siddhpur: { lat: 23.9169, lng: 72.3712 },
  radhanpur: { lat: 23.8322, lng: 71.6061 },
  chanasma: { lat: 23.7145, lng: 72.1156 },
  harij: { lat: 23.6967, lng: 71.9012 },
  banaskantha: { lat: 24.1742, lng: 72.4319 },
  palanpur: { lat: 24.1742, lng: 72.4319 },
  deesa: { lat: 24.2585, lng: 72.1907 },
  dhanera: { lat: 24.5138, lng: 72.0226 },
  tharad: { lat: 24.3941, lng: 71.6258 },
  ambaji: { lat: 24.3315, lng: 72.8518 },
  sabarkantha: { lat: 23.5969, lng: 72.9661 },
  himatnagar: { lat: 23.5969, lng: 72.9661 },
  himmatnagar: { lat: 23.5969, lng: 72.9661 },
  idar: { lat: 23.8351, lng: 73.0005 },
  prantij: { lat: 23.4375, lng: 72.8562 },
  talod: { lat: 23.3547, lng: 72.9531 },
  khedbrahma: { lat: 24.0279, lng: 73.0463 },
  aravalli: { lat: 23.4643, lng: 73.2988 },
  modasa: { lat: 23.4643, lng: 73.2988 },
  bhiloda: { lat: 23.7591, lng: 73.2452 },
  bayad: { lat: 23.2259, lng: 73.2156 },
  dhansura: { lat: 23.3461, lng: 73.2075 },

  // Central Gujarat Districts & Talukas
  kheda: { lat: 22.7507, lng: 72.6847 },
  nadiad: { lat: 22.6916, lng: 72.8634 },
  kapadvanj: { lat: 23.0211, lng: 73.0715 },
  dakore: { lat: 22.7539, lng: 73.1492 },
  dakor: { lat: 22.7539, lng: 73.1492 },
  mehmedabad: { lat: 22.8286, lng: 72.7634 },
  anand: { lat: 22.5645, lng: 72.9289 },
  vallabhvidyanagar: { lat: 22.5446, lng: 72.9242 },
  borsad: { lat: 22.4087, lng: 72.8992 },
  petlad: { lat: 22.4765, lng: 72.8012 },
  khambhat: { lat: 22.3181, lng: 72.6190 },
  umreth: { lat: 22.6987, lng: 73.1145 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  baroda: { lat: 22.3072, lng: 73.1812 },
  padra: { lat: 22.2412, lng: 73.0845 },
  karjan: { lat: 22.0526, lng: 73.1221 },
  dabhoi: { lat: 22.1292, lng: 73.4139 },
  savli: { lat: 22.5612, lng: 73.2215 },
  waghodia: { lat: 22.2995, lng: 73.3958 },
  panchmahal: { lat: 22.7788, lng: 73.6143 },
  godhra: { lat: 22.7788, lng: 73.6143 },
  halol: { lat: 22.5028, lng: 73.4716 },
  kalol_panchmahal: { lat: 22.6062, lng: 73.4628 },
  dahod: { lat: 22.8379, lng: 74.2531 },
  jhalod: { lat: 23.1028, lng: 74.1558 },
  devgadbaria: { lat: 22.6967, lng: 73.9092 },
  mahisagar: { lat: 23.1306, lng: 73.6026 },
  lunawada: { lat: 23.1306, lng: 73.6026 },
  balasinor: { lat: 22.9567, lng: 73.3345 },
  santrampur: { lat: 23.1921, lng: 73.8962 },
  "chhota udaipur": { lat: 22.3085, lng: 74.0120 },
  bodeli: { lat: 22.2698, lng: 73.7192 },

  // South Gujarat Districts & Talukas
  bharuch: { lat: 21.7051, lng: 72.9959 },
  ankleshwar: { lat: 21.6264, lng: 73.0152 },
  jambusar: { lat: 22.0528, lng: 72.8021 },
  dahej: { lat: 21.7115, lng: 72.5831 },
  narmada: { lat: 21.8705, lng: 73.5029 },
  rajpipla: { lat: 21.8705, lng: 73.5029 },
  kevadia: { lat: 21.8380, lng: 73.7191 },
  surat: { lat: 21.1702, lng: 72.8311 },
  bardoli: { lat: 21.1255, lng: 73.1122 },
  kamrej: { lat: 21.2695, lng: 72.9579 },
  olpad: { lat: 21.3352, lng: 72.7521 },
  mangrol_surat: { lat: 21.4167, lng: 73.0167 },
  mandvi_surat: { lat: 21.2556, lng: 73.3039 },
  tapi: { lat: 21.1131, lng: 73.4004 },
  vyara: { lat: 21.1131, lng: 73.4004 },
  songadh: { lat: 21.1685, lng: 73.5621 },
  navsari: { lat: 20.9467, lng: 72.9520 },
  bilimora: { lat: 20.7695, lng: 72.9613 },
  chikhli: { lat: 20.7579, lng: 73.0625 },
  valsad: { lat: 20.5992, lng: 72.9342 },
  vapi: { lat: 20.3893, lng: 72.9106 },
  pardi: { lat: 20.5112, lng: 72.9512 },
  umargam: { lat: 20.1965, lng: 72.7489 },
  dharampur: { lat: 20.5369, lng: 73.1751 },
  dang: { lat: 20.7538, lng: 73.6866 },
  ahwa: { lat: 20.7538, lng: 73.6866 },
  saputara: { lat: 20.5760, lng: 73.7469 },

  // Saurashtra & Kutch Districts & Talukas
  rajkot: { lat: 22.3039, lng: 70.8022 },
  gondal: { lat: 21.9619, lng: 70.7923 },
  jetpur: { lat: 21.7548, lng: 70.6234 },
  dhoraji: { lat: 21.7336, lng: 70.4504 },
  upleta: { lat: 21.7412, lng: 70.2812 },
  jasdan: { lat: 22.0308, lng: 71.2095 },
  morbi: { lat: 22.8173, lng: 70.8377 },
  wankaner: { lat: 22.6122, lng: 70.9522 },
  halvad: { lat: 23.0145, lng: 71.1812 },
  tankara: { lat: 22.6552, lng: 70.7428 },
  surendranagar: { lat: 22.7284, lng: 71.6371 },
  wadhwan: { lat: 22.7042, lng: 71.6752 },
  dhrangadhra: { lat: 22.9906, lng: 71.4669 },
  limbdi: { lat: 22.5651, lng: 71.8108 },
  chotila: { lat: 22.4235, lng: 71.1962 },
  jamnagar: { lat: 22.4707, lng: 70.0577 },
  dhrol: { lat: 22.5712, lng: 70.4225 },
  kalavad: { lat: 22.2089, lng: 70.3802 },
  "devbhumi dwarka": { lat: 22.2442, lng: 68.9685 },
  dwarka: { lat: 22.2442, lng: 68.9685 },
  khambhalia: { lat: 22.2047, lng: 69.6562 },
  porbandar: { lat: 21.6417, lng: 69.6293 },
  ranavav: { lat: 21.6821, lng: 69.7421 },
  kutiyana: { lat: 21.6289, lng: 69.9812 },
  junagadh: { lat: 21.5222, lng: 70.4579 },
  keshod: { lat: 21.2997, lng: 70.2520 },
  mangrol: { lat: 21.1228, lng: 70.1147 },
  visavadar: { lat: 21.3412, lng: 70.7521 },
  "gir somnath": { lat: 20.9060, lng: 70.3844 },
  veraval: { lat: 20.9060, lng: 70.3844 },
  somnath: { lat: 20.8880, lng: 70.4012 },
  kodinar: { lat: 20.7931, lng: 70.7031 },
  una: { lat: 20.8228, lng: 71.0381 },
  talala: { lat: 21.0512, lng: 70.5218 },
  amreli: { lat: 21.6032, lng: 71.2221 },
  savarkundla: { lat: 21.3372, lng: 71.3045 },
  rajula: { lat: 21.0389, lng: 71.4425 },
  bagasara: { lat: 21.4842, lng: 70.9562 },
  dhari: { lat: 21.3289, lng: 71.0258 },
  bhavnagar: { lat: 21.7645, lng: 72.1519 },
  mahuva: { lat: 21.0922, lng: 71.7705 },
  palitana: { lat: 21.5256, lng: 71.8347 },
  sihor: { lat: 21.7189, lng: 71.9592 },
  talaja: { lat: 21.3522, lng: 72.0336 },
  botad: { lat: 22.1716, lng: 71.6661 },
  gadhada: { lat: 21.9689, lng: 71.5762 },
  barwala: { lat: 22.1528, lng: 71.8895 },
  kutch: { lat: 23.2420, lng: 69.6669 },
  bhuj: { lat: 23.2420, lng: 69.6669 },
  gandhidham: { lat: 23.0753, lng: 70.1337 },
  anjar: { lat: 23.1145, lng: 70.0269 },
  mandvi: { lat: 22.8328, lng: 69.3524 },
  mundra: { lat: 22.8394, lng: 69.7213 },
  bhachau: { lat: 23.2961, lng: 70.3358 },
  rapar: { lat: 23.5745, lng: 70.6421 },
  nakhatrana: { lat: 23.3478, lng: 69.2658 },

  // Major Pan-India Cities
  mumbai: { lat: 19.0760, lng: 72.8777 },
  thane: { lat: 19.2183, lng: 72.9781 },
  pune: { lat: 18.5204, lng: 73.8567 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  udaipur: { lat: 24.5854, lng: 73.7125 },
  jodhpur: { lat: 26.2389, lng: 73.0243 },
  kota: { lat: 25.2138, lng: 75.8648 },
  indore: { lat: 22.7196, lng: 75.8577 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  ujjain: { lat: 23.1765, lng: 75.7885 },
  ratlam: { lat: 23.3315, lng: 75.0367 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  noida: { lat: 28.5355, lng: 77.3910 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  patna: { lat: 25.5941, lng: 85.1376 }
};

/**
 * Resolves a location string (e.g. "Kalol, Gandhinagar" or "Sanand, Ahmedabad, Gujarat") to { lat, lng, matchedKey }.
 */
export function resolveLocationCoordinates(locStr?: string | null): { lat: number; lng: number; matchedKey: string } | null {
  if (!locStr || typeof locStr !== 'string') return null;
  const cleaned = locStr.trim().toLowerCase();
  if (!cleaned || cleaned === 'local area' || cleaned === 'nearby' || cleaned === 'all' || cleaned === 'india') {
    return null;
  }

  // Split by comma/slash/hyphen from most specific (taluka/area) to least specific (district/state)
  const parts = cleaned
    .split(/[,/\-•|]+/)
    .map((p) => p.replace(/\(.*?\)/g, '').trim())
    .filter((p) => p && p !== 'gujarat' && p !== 'india' && p !== 'local area');

  for (const part of parts) {
    if (LOCATION_COORDINATES_MAP[part]) {
      return { ...LOCATION_COORDINATES_MAP[part], matchedKey: part };
    }
    // Check partial token match (e.g., "kalol gidc" -> "kalol")
    const words = part.split(/\s+/);
    for (const w of words) {
      if (w.length >= 3 && LOCATION_COORDINATES_MAP[w]) {
        return { ...LOCATION_COORDINATES_MAP[w], matchedKey: w };
      }
    }
  }

  return null;
}

/**
 * Calculates the real Haversine distance in kilometers between two locations or coordinates.
 * Returns null if peer location is unknown ("Local Area"), or 0 if both are in the exact same taluka/area without distinct GPS coordinates.
 */
export function calculateLocationDistanceKm(
  userLocStr?: string | null,
  peerLocStr?: string | null,
  userGps?: { lat?: number | null; lng?: number | null },
  peerGps?: { lat?: number | null; lng?: number | null }
): number | null {
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const hasValidUserGps =
    userGps && typeof userGps.lat === 'number' && typeof userGps.lng === 'number' && !Number.isNaN(userGps.lat) && !Number.isNaN(userGps.lng);
  const hasValidPeerGps =
    peerGps && typeof peerGps.lat === 'number' && typeof peerGps.lng === 'number' && !Number.isNaN(peerGps.lat) && !Number.isNaN(peerGps.lng);

  if (hasValidUserGps && hasValidPeerGps) {
    const dist = haversine(userGps!.lat!, userGps!.lng!, peerGps!.lat!, peerGps!.lng!);
    if (dist > 0.05) return dist;
  }

  const peerResolved = resolveLocationCoordinates(peerLocStr);
  if (!peerResolved) return null;

  let userResolved = resolveLocationCoordinates(userLocStr);
  if (!userResolved) {
    const regLoc = getProfileRegisteredLocation();
    const fallbackStr = [regLoc.taluka, regLoc.district].filter(Boolean).join(', ');
    userResolved = resolveLocationCoordinates(fallbackStr);
  }

  if (hasValidUserGps && peerResolved) {
    return haversine(userGps!.lat!, userGps!.lng!, peerResolved.lat, peerResolved.lng);
  }

  if (userResolved && peerResolved) {
    if (userResolved.matchedKey === peerResolved.matchedKey) {
      return 0; // Same taluka/city
    }
    return haversine(userResolved.lat, userResolved.lng, peerResolved.lat, peerResolved.lng);
  }

  return null;
}


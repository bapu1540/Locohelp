import { getCurrentUser, saveUserProfile } from '../auth';

export interface UserManualLocation {
  state: string;
  district: string;
  area?: string;
}

export const PAN_INDIA_STATES_DISTRICTS: Record<string, string[]> = {
  "Gujarat": [
    "Gandhinagar", "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh",
    "Anand", "Bharuch", "Kheda", "Mehsana", "Patan", "Banaskantha", "Sabarkantha", "Aravalli",
    "Kutch", "Valsad", "Navsari", "Morbi", "Surendranagar", "Amreli", "Gir Somnath", "Porbandar",
    "Botad", "Dahod", "Panchmahal", "Mahisagar", "Chhota Udaipur", "Narmada", "Tapi", "Dang", "Devbhumi Dwarka"
  ],
  "Maharashtra": [
    "Mumbai", "Mumbai Suburban", "Thane", "Pune", "Nagpur", "Nashik", "Aurangabad (Chhatrapati Sambhajinagar)",
    "Solapur", "Kolhapur", "Satara", "Sangli", "Ahmednagar", "Jalgaon", "Dhule", "Nanded", "Latur",
    "Amravati", "Akola", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg", "Chandrapur", "Wardha", "Yavatmal"
  ],
  "Delhi (NCT)": [
    "New Delhi", "Central Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi",
    "South West Delhi", "North West Delhi", "Shahdara", "Dwarka", "Rohini"
  ],
  "Rajasthan": [
    "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bharatpur",
    "Sikar", "Pali", "Bhilwara", "Sri Ganganagar", "Chittorgarh", "Jhunjhunu", "Nagaur",
    "Barmer", "Jaisalmer", "Sirohi", "Dungarpur", "Banswara", "Sawai Madhopur", "Tonk"
  ],
  "Uttar Pradesh": [
    "Lucknow", "Noida (Gautam Buddha Nagar)", "Ghaziabad", "Kanpur Nagar", "Varanasi", "Agra",
    "Prayagraj", "Meerut", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur",
    "Jhansi", "Mathura", "Ayodhya", "Muzaffarnagar", "Sultanpur", "Unnao", "Rae Bareli"
  ],
  "Madhya Pradesh": [
    "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna",
    "Ratlam", "Rewa", "Khandwa", "Chhindwara", "Katni", "Morena", "Vidisha", "Mandsaur", "Neemuch"
  ],
  "Karnataka": [
    "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru (Dakshina Kannada)", "Hubballi-Dharwad",
    "Belagavi", "Kalaburagi", "Ballari", "Davangere", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura", "Hassan"
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli",
    "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Chengalpattu", "Kanchipuram", "Thanjavur", "Kanyakumari"
  ],
  "Telangana": [
    "Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Warangal", "Nizamabad", "Khammam",
    "Karimnagar", "Sangareddy", "Mahabubnagar", "Nalgonda", "Adilabad"
  ],
  "Andhra Pradesh": [
    "Visakhapatnam", "Vijayawada (NTR)", "Guntur", "Tirupati", "Kurnool", "Nellore",
    "Kakinada", "Rajahmundry", "Anantapur", "Kadapa", "Eluru", "Vizianagaram"
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "North 24 Parganas", "South 24 Parganas", "Hooghly", "Darjeeling",
    "Siliguri", "Paschim Bardhaman (Asansol/Durgapur)", "Purba Bardhaman", "Nadia", "Murshidabad", "Malda"
  ],
  "Bihar": [
    "Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia", "Begusarai",
    "Samastipur", "Saran (Chhapra)", "Vaishali (Hajipur)", "Nalanda", "Bhojpur (Arrah)", "Rohtas"
  ],
  "Punjab": [
    "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali (SAS Nagar)", "Bathinda",
    "Hoshiarpur", "Pathankot", "Moga", "Kapurthala", "Sangrur", "Firozpur", "Gurdaspur"
  ],
  "Haryana": [
    "Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak",
    "Sonipat", "Panchkula", "Yamunanagar", "Kurukshetra", "Sirsa", "Rewari", "Jhajjar"
  ],
  "Kerala": [
    "Thiruvananthapuram", "Kochi (Ernakulam)", "Kozhikode", "Thrissur", "Kollam",
    "Kannur", "Alappuzha", "Kottayam", "Palakkad", "Malappuram", "Wayanad", "Idukki"
  ],
  "Odisha": [
    "Bhubaneswar (Khordha)", "Cuttack", "Rourkela (Sundargarh)", "Puri", "Sambalpur",
    "Berhampur (Ganjam)", "Balasore", "Bhadrak", "Jajpur", "Angul", "Jharsuguda"
  ],
  "Assam": [
    "Guwahati (Kamrup Metro)", "Kamrup", "Dibrugarh", "Jorhat", "Silchar (Cachar)",
    "Nagaon", "Tinsukia", "Tezpur (Sonitpur)", "Bongaigaon", "Goalpara"
  ],
  "Jharkhand": [
    "Ranchi", "Jamshedpur (East Singhbhum)", "Dhanbad", "Bokaro", "Deoghar",
    "Hazaribagh", "Giridih", "Ramgarh", "Palamu", "Dumka"
  ],
  "Chhattisgarh": [
    "Raipur", "Bhilai-Durg", "Bilaspur", "Korba", "Rajnandgaon", "Raigarh", "Jagdalpur (Bastar)", "Ambikapur"
  ],
  "Uttarakhand": [
    "Dehradun", "Haridwar", "Nainital (Haldwani)", "Udham Singh Nagar (Rudrapur)", "Roorkee", "Rishikesh", "Pauri Garhwal", "Almora"
  ],
  "Himachal Pradesh": [
    "Shimla", "Kangra (Dharamshala)", "Mandi", "Solan", "Kullu", "Hamirpur", "Una", "Bilaspur", "Chamba", "Sirmaur"
  ],
  "Goa": [
    "North Goa (Panaji/Mapusa)", "South Goa (Margao/Vasco)"
  ],
  "Chandigarh": [
    "Chandigarh"
  ],
  "Jammu & Kashmir": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur", "Kathua", "Pulwama", "Kupwara"
  ],
  "Puducherry": [
    "Puducherry", "Karaikal", "Mahe", "Yanam"
  ],
  "North East & Other States": [
    "Gangtok (Sikkim)", "Shillong (Meghalaya)", "Agartala (Tripura)", "Imphal (Manipur)",
    "Aizawl (Mizoram)", "Kohima (Nagaland)", "Dimapur (Nagaland)", "Itanagar (Arunachal Pradesh)",
    "Leh (Ladakh)", "Port Blair (Andaman & Nicobar)", "Silvassa (Dadra & Nagar Haveli)", "Daman", "Diu"
  ]
};

export const DISTRICT_POPULAR_AREAS: Record<string, string[]> = {
  "Gandhinagar": ["Kudasan", "Sector 21", "Sargasan", "Infocity", "Raysan", "Sector 11", "Adalaj", "Kalol", "GIFT City", "Koba", "Pethapur"],
  "Ahmedabad": ["Chandkheda", "Bopal", "Motera", "Gota", "Navrangpura", "Satellite", "Prahlad Nagar", "Maninagar", "SG Highway", "Vastrapur", "Nikol", "Thaltej"],
  "Surat": ["Adajan", "Vesu", "Varachha", "Katargam", "Piplod", "City Light", "Udhna", "Palanpur Patia", "Dindoli"],
  "Vadodara": ["Alkapuri", "Gotri", "Manjalpur", "Karelibaug", "Waghodia Road", "Akota", "Nizampura", "Vasna"],
  "Rajkot": ["Kalawad Road", "Yagnik Road", "Mavdi", "Raiya Road", "Gondal Road", "150 Feet Ring Road"],
  "Mumbai": ["Andheri", "Bandra", "Borivali", "Dadar", "Goregaon", "Malad", "Powai", "Kandivali", "Colaba", "Worli"],
  "Thane": ["Majiwada", "Ghodbunder Road", "Kalyan", "Dombivli", "Mira Road", "Ulhasnagar", "Vashi", "Nerul"],
  "Pune": ["Kothrud", "Hinjewadi", "Wakad", "Viman Nagar", "Baner", "Hadapsar", "Kharadi", "Pimpri-Chinchwad", "Shivajinagar"],
  "New Delhi": ["Connaught Place", "Karol Bagh", "Lajpat Nagar", "Saket", "Dwarka", "Rohini", "Janakpuri", "Vasant Kunj", "Laxmi Nagar"],
  "Jaipur": ["Vaishali Nagar", "Malviya Nagar", "Mansarovar", "Jagatpura", "Raja Park", "C-Scheme", "Jhotwara"],
  "Lucknow": ["Gomti Nagar", "Hazratganj", "Indira Nagar", "Aliganj", "Alambagh", "Mahanagar"],
  "Indore": ["Vijay Nagar", "Palasia", "Bhawarkua", "Rajendra Nagar", "Sudama Nagar", "Super Corridor"],
  "Bengaluru Urban": ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "Electronic City", "Jayanagar", "Marathahalli"],
  "Hyderabad": ["Gachibowli", "Madhapur", "Kukatpally", "Banjara Hills", "Secunderabad", "Miyapur", "Begumpet"],
  "Chennai": ["T. Nagar", "Anna Nagar", "Adyar", "Velachery", "Tambaram", "OMR", "Porur"],
  "Kolkata": ["Salt Lake", "New Town", "Park Street", "Ballygunge", "Dum Dum", "Garia", "Behala"]
};

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
  "new delhi": ["new delhi", "central delhi", "north delhi", "south delhi", "east delhi", "west delhi", "dwarka", "rohini", "noida (gautam buddha nagar)", "noida", "ghaziabad", "gurugram", "faridabad"],
  "noida (gautam buddha nagar)": ["noida (gautam buddha nagar)", "noida", "ghaziabad", "new delhi", "east delhi", "south delhi", "faridabad", "gurugram"],
  "ghaziabad": ["ghaziabad", "noida (gautam buddha nagar)", "noida", "new delhi", "east delhi", "meerut"],
  "gurugram": ["gurugram", "faridabad", "new delhi", "south delhi", "dwarka", "rewari"],
  "faridabad": ["faridabad", "gurugram", "new delhi", "south delhi", "noida (gautam buddha nagar)"],
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
  "chandigarh": ["chandigarh", "mohali (sas nagar)", "panchkula", "ambala", "patiala"],
  "mohali (sas nagar)": ["mohali (sas nagar)", "chandigarh", "panchkula", "patiala"],
  "panchkula": ["panchkula", "chandigarh", "mohali (sas nagar)", "ambala"]
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

export function getSavedUserLocation(): UserManualLocation {
  try {
    const raw = localStorage.getItem('locohelp_user_location');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.district) {
        return {
          state: parsed.state || findStateForDistrict(parsed.district),
          district: parsed.district,
          area: parsed.area || localStorage.getItem('locohelp_selected_area') || ''
        };
      }
    }

    // Check user profile address/location if stored
    const savedUserRaw = localStorage.getItem('locohelp_user');
    if (savedUserRaw) {
      const u = JSON.parse(savedUserRaw);
      if (u && u.manualDistrict) {
        return {
          state: u.manualState || findStateForDistrict(u.manualDistrict),
          district: u.manualDistrict,
          area: u.manualArea || ''
        };
      }
    }

    const legacyCity = localStorage.getItem('locohelp_selected_city');
    const legacyState = localStorage.getItem('locohelp_selected_state');
    const legacyArea = localStorage.getItem('locohelp_selected_area');
    if (legacyCity) {
      return {
        state: legacyState || findStateForDistrict(legacyCity),
        district: legacyCity,
        area: legacyArea || ''
      };
    }
  } catch (e) {}

  return {
    state: 'Gujarat',
    district: 'Gandhinagar',
    area: 'Kudasan'
  };
}

export async function saveUserLocationPermanently(loc: UserManualLocation): Promise<void> {
  const cleanState = (loc.state || 'Gujarat').trim();
  const cleanDistrict = (loc.district || 'Gandhinagar').trim();
  const cleanArea = (loc.area || '').trim();

  const payload: UserManualLocation = {
    state: cleanState,
    district: cleanDistrict,
    area: cleanArea
  };

  try {
    localStorage.setItem('locohelp_user_location', JSON.stringify(payload));
    localStorage.setItem('locohelp_selected_state', cleanState);
    localStorage.setItem('locohelp_selected_city', cleanDistrict);
    if (cleanArea) {
      localStorage.setItem('locohelp_selected_area', cleanArea);
    }

    // Also persist inside locohelp_user and backend profile if logged in
    const savedUserRaw = localStorage.getItem('locohelp_user');
    if (savedUserRaw) {
      const parsedUser = JSON.parse(savedUserRaw);
      if (parsedUser && parsedUser.uid && parsedUser.uid !== 'guest_user') {
        const updatedUser = {
          ...parsedUser,
          manualState: cleanState,
          manualDistrict: cleanDistrict,
          manualArea: cleanArea,
          address: cleanArea ? `${cleanArea}, ${cleanDistrict}, ${cleanState}` : `${cleanDistrict}, ${cleanState}`
        };
        localStorage.setItem('locohelp_user', JSON.stringify(updatedUser));
        saveUserProfile(updatedUser).catch(() => {});
      }
    }
    window.dispatchEvent(new CustomEvent('locohelp_location_changed', { detail: payload }));
  } catch (e) {
    console.warn('Location save error:', e);
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

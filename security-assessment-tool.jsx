import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { AlertTriangle, Shield, Lock, Eye, Building, CheckCircle, Download, ChevronDown, ChevronUp, Camera } from "lucide-react";

const FACILITY_TYPES = [
  "Power Generation",
  "Transmission & Distribution (Substations)",
  "Oil & Gas (Upstream / Midstream / Downstream)",
  "Pipelines & Pumping Stations",
  "LNG & Gasification",
  "Renewables",
  "Water / Wastewater",
];


const ASSETS_BY_SUBVERTICAL = {
  "Power Generation": [
    "Generation Units (Turbines / Boilers / Reactors)",
    "Fuel Handling & Storage Systems",
    "Control Room & SCADA Systems",
    "Grid Interconnection & Switchyard",
  ],
  "Transmission & Distribution (Substations)": [
    "Transmission Lines & Towers",
    "Distribution Feeders & Circuits",
    "Power Transformers",
    "High-Voltage Switchgear",
  ],
  "Oil & Gas (Upstream / Midstream / Downstream)": [
    "Production & Processing Units",
    "Storage Tanks & Tank Farms",
    "Control Room & SCADA Systems",
    "Pipeline Interconnects & Transfer Systems",
  ],
  "Pipelines & Pumping Stations": [
    "Pump / Compressor Units",
    "Mainline Pipeline Infrastructure",
    "Control Room & SCADA Systems",
    "Valve Stations & Flow Control Systems",
  ],
  "LNG & Gasification": [
    "LNG Storage Tanks",
    "Liquefaction / Regasification Trains",
    "Control Room & Safety Systems",
    "Marine / Truck Loading Facilities",
  ],
  "Renewables": [
    "Generation Arrays (Solar Panels / Wind Turbines)",
    "Inverters & Power Conversion Systems",
    "Energy Storage Systems (BESS)",
    "Grid Interconnection & Substation",
  ],
  "Water / Wastewater": [
    "Treatment Process Systems",
    "Pumping Stations",
    "Control Room & SCADA Systems",
    "Chemical Storage & Handling Systems",
  ],
};

const LOCATION_ATTRIBUTES = ["Urban", "Suburban", "Rural / Remote"];

const THREAT_CATEGORIES = [
  {
    category: "Theft",
    threats: [
      {
        name: "Material theft",
        description: "Copper, metals, wire, grounding, fuel, and lubricants theft driven by resale value, often repeat offenders hitting known weak points."
      },
      {
        name: "Equipment theft",
        description: "Portable generators, welders, skid steers, trailers, cameras, test sets, and tools, especially during outages and construction."
      }
    ]
  },
  {
    category: "Vandalism and sabotage",
    threats: [
      {
        name: "Opportunistic vandalism",
        description: "Graffiti, broken lighting, cut fences, damage to signage and gates."
      },
      {
        name: "Arson / Intentional Fire",
        description: "Deliberate ignition of vegetation, structures, or equipment near right-of-way, facilities, or substations. Includes trash/brush fire ignition, timed burns, and accelerant-assisted attacks."
      },
      {
        name: "Protest-related damage",
        description: "Vandalism tied to activism around energy, environment, or eminent domain."
      }
    ]
  },
  {
    category: "Trespassing and unauthorized presence",
    threats: [
      {
        name: "Curiosity and exploration",
        description: "Urban explorers, photography, drones, or recreational entry into fenced sites."
      },
      {
        name: "Encampments",
        description: "Unhoused activity near corridors, pump stations, yards, or under structures."
      },
      {
        name: "Unauthorized contractors",
        description: "Wrong crew, wrong scope, or expired access still entering due to weak verification."
      },
      {
        name: "Surveillance and probing",
        description: "Repeated drive-bys, mapping, camera placements, fence testing, and attempts to access cabinets."
      },
      {
        name: "Drone-enabled reconnaissance",
        description: "Drone overflights to learn layout, shift changes, response time, and camera placement."
      }
    ]
  },
  {
    category: "Targeted attack",
    threats: [
      {
        name: "Insider threat",
        description: "Disgruntled employee or contractor with knowledge of schedules, access paths, and critical nodes."
      },
      {
        name: "Coordinated physical attack",
        description: "Multiple actors targeting power, pipeline, telecom, or control locations to create cascading impacts."
      }
    ]
  },
  {
    category: "Accidental and environmental",
    threats: [
      {
        name: "Vehicle strikes",
        description: "Impacts to gates, bollards, piping, cabinets, and equipment by passenger vehicles or heavy trucks."
      },
      {
        name: "Natural hazards",
        description: "Flood, lightning, high wind, wildfire, ice, extreme heat, and erosion undermining access roads and foundations."
      },
      {
        name: "Hazardous materials release",
        description: "Leaks, spills, and improper storage, plus stormwater issues and secondary containment failures."
      }
    ]
  }
];

const THREAT_CONTROL_MAP = {
  "Material theft": { controls: ["fencing", "gates", "lighting", "cctv", "intrusion", "monitoring", "locks"], duration: 20 },
  "Equipment theft": { controls: ["fencing", "gates", "lighting", "cctv", "intrusion", "monitoring", "locks"], duration: 15 },
  "Opportunistic vandalism": { controls: ["fencing", "signage", "lighting", "cctv", "intrusion", "monitoring", "locks"], duration: 5 },
  "Arson / Intentional Fire": { controls: ["fencing", "lighting", "cctv", "intrusion", "monitoring", "patrols", "enclosures"], duration: 3 },
  "Protest-related damage": { controls: ["fencing", "bollards", "gates", "cctv", "intrusion", "monitoring", "security"], duration: 60 },
  "Curiosity and exploration": { controls: ["fencing", "signage", "gates", "lighting", "cctv", "intrusion", "monitoring", "locks"], duration: null },
  "Encampments": { controls: ["fencing", "signage", "gates", "lighting", "cctv", "intrusion", "patrols", "monitoring"], duration: null },
  "Unauthorized contractors": { controls: ["cardReaders", "visitorMgmt", "credentialAcct", "cctv", "intrusion", "monitoring"], duration: null },
  "Surveillance and probing": { controls: ["fencing", "lighting", "signage", "cctv", "intrusion", "monitoring"], duration: null },
  "Drone-enabled reconnaissance": { controls: ["cctv", "monitoring", "drone"], duration: null },
  "Insider threat": { controls: ["cardReaders", "visitorMgmt", "credentialAcct", "cctv", "intrusion", "monitoring", "locks"], duration: null },
  "Coordinated physical attack": { controls: ["fencing", "bollards", "gates", "lighting", "cctv", "intrusion", "monitoring", "security", "enclosures", "locks", "redundancy", "communications"], duration: 30 },
  "Vehicle strikes": { controls: ["bollards", "fencing", "signage", "lighting", "gates"], duration: 0 },
  "Natural hazards": { controls: ["enclosures", "redundancy", "communications"], duration: null },
  "Hazardous materials release": { controls: ["enclosures", "locks", "signage", "monitoring", "communications"], duration: null }
};

// Threat-to-Asset Mapping: Which assets can each threat realistically impact?
const THREAT_ASSET_MAP = {
  "Power Generation": {
    "Material theft": ["Generation Units (Turbines / Boilers / Reactors)", "Fuel Handling & Storage Systems", "Grid Interconnection & Switchyard"],
    "Equipment theft": ["Fuel Handling & Storage Systems", "Control Room & SCADA Systems"],
    "Opportunistic vandalism": ["Fuel Handling & Storage Systems", "Grid Interconnection & Switchyard"],
    "Arson / Intentional Fire": ["Generation Units (Turbines / Boilers / Reactors)", "Fuel Handling & Storage Systems"],
    "Protest-related damage": ["Generation Units (Turbines / Boilers / Reactors)", "Grid Interconnection & Switchyard", "Fuel Handling & Storage Systems"],
    "Curiosity and exploration": ["Generation Units (Turbines / Boilers / Reactors)", "Fuel Handling & Storage Systems"],
    "Encampments": ["Fuel Handling & Storage Systems", "Grid Interconnection & Switchyard"],
    "Unauthorized contractors": ["Generation Units (Turbines / Boilers / Reactors)", "Control Room & SCADA Systems", "Fuel Handling & Storage Systems"],
    "Surveillance and probing": ["Generation Units (Turbines / Boilers / Reactors)", "Control Room & SCADA Systems", "Grid Interconnection & Switchyard"],
    "Drone-enabled reconnaissance": ["Generation Units (Turbines / Boilers / Reactors)", "Control Room & SCADA Systems", "Grid Interconnection & Switchyard"],
    "Insider threat": ["Generation Units (Turbines / Boilers / Reactors)", "Control Room & SCADA Systems", "Fuel Handling & Storage Systems"],
    "Coordinated physical attack": ["Generation Units (Turbines / Boilers / Reactors)", "Control Room & SCADA Systems", "Grid Interconnection & Switchyard"],
    "Vehicle strikes": ["Generation Units (Turbines / Boilers / Reactors)", "Control Room & SCADA Systems", "Grid Interconnection & Switchyard"],
    "Natural hazards": ["Generation Units (Turbines / Boilers / Reactors)", "Fuel Handling & Storage Systems", "Control Room & SCADA Systems", "Grid Interconnection & Switchyard"],
    "Hazardous materials release": ["Generation Units (Turbines / Boilers / Reactors)", "Fuel Handling & Storage Systems"]
  },
  "Transmission & Distribution (Substations)": {
    "Material theft": ["Transmission Lines & Towers", "Distribution Feeders & Circuits", "Power Transformers", "High-Voltage Switchgear"],
    "Equipment theft": ["High-Voltage Switchgear"],
    "Opportunistic vandalism": ["Distribution Feeders & Circuits", "High-Voltage Switchgear"],
    "Arson / Intentional Fire": ["Transmission Lines & Towers", "Distribution Feeders & Circuits"],
    "Protest-related damage": ["Power Transformers", "High-Voltage Switchgear"],
    "Curiosity and exploration": ["Power Transformers", "High-Voltage Switchgear"],
    "Encampments": ["Transmission Lines & Towers", "Distribution Feeders & Circuits"],
    "Unauthorized contractors": ["Power Transformers", "High-Voltage Switchgear"],
    "Surveillance and probing": ["Power Transformers", "High-Voltage Switchgear"],
    "Drone-enabled reconnaissance": ["Power Transformers", "High-Voltage Switchgear"],
    "Insider threat": ["Power Transformers", "High-Voltage Switchgear"],
    "Coordinated physical attack": ["Power Transformers", "High-Voltage Switchgear"],
    "Vehicle strikes": ["Power Transformers", "High-Voltage Switchgear"],
    "Natural hazards": ["Transmission Lines & Towers", "Distribution Feeders & Circuits", "Power Transformers", "High-Voltage Switchgear"]
  },
  "Oil & Gas (Upstream / Midstream / Downstream)": {
    "Material theft": ["Production & Processing Units", "Storage Tanks & Tank Farms", "Pipeline Interconnects & Transfer Systems"],
    "Equipment theft": ["Production & Processing Units", "Control Room & SCADA Systems"],
    "Opportunistic vandalism": ["Storage Tanks & Tank Farms", "Pipeline Interconnects & Transfer Systems"],
    "Arson / Intentional Fire": ["Production & Processing Units", "Storage Tanks & Tank Farms", "Pipeline Interconnects & Transfer Systems"],
    "Protest-related damage": ["Production & Processing Units", "Storage Tanks & Tank Farms", "Pipeline Interconnects & Transfer Systems"],
    "Curiosity and exploration": ["Production & Processing Units", "Storage Tanks & Tank Farms"],
    "Encampments": ["Pipeline Interconnects & Transfer Systems", "Storage Tanks & Tank Farms"],
    "Unauthorized contractors": ["Production & Processing Units", "Control Room & SCADA Systems", "Storage Tanks & Tank Farms"],
    "Surveillance and probing": ["Production & Processing Units", "Control Room & SCADA Systems", "Storage Tanks & Tank Farms"],
    "Drone-enabled reconnaissance": ["Production & Processing Units", "Control Room & SCADA Systems", "Storage Tanks & Tank Farms", "Pipeline Interconnects & Transfer Systems"],
    "Insider threat": ["Production & Processing Units", "Control Room & SCADA Systems", "Storage Tanks & Tank Farms"],
    "Coordinated physical attack": ["Production & Processing Units", "Control Room & SCADA Systems", "Pipeline Interconnects & Transfer Systems"],
    "Vehicle strikes": ["Production & Processing Units", "Control Room & SCADA Systems", "Pipeline Interconnects & Transfer Systems"],
    "Natural hazards": ["Production & Processing Units", "Storage Tanks & Tank Farms", "Pipeline Interconnects & Transfer Systems", "Control Room & SCADA Systems"],
    "Hazardous materials release": ["Production & Processing Units", "Storage Tanks & Tank Farms", "Pipeline Interconnects & Transfer Systems"]
  },
  "Pipelines & Pumping Stations": {
    "Material theft": ["Pump / Compressor Units", "Mainline Pipeline Infrastructure", "Valve Stations & Flow Control Systems"],
    "Equipment theft": ["Pump / Compressor Units", "Control Room & SCADA Systems", "Valve Stations & Flow Control Systems"],
    "Opportunistic vandalism": ["Valve Stations & Flow Control Systems", "Mainline Pipeline Infrastructure"],
    "Arson / Intentional Fire": ["Pump / Compressor Units", "Mainline Pipeline Infrastructure"],
    "Protest-related damage": ["Pump / Compressor Units", "Mainline Pipeline Infrastructure", "Valve Stations & Flow Control Systems"],
    "Curiosity and exploration": ["Pump / Compressor Units", "Valve Stations & Flow Control Systems"],
    "Encampments": ["Mainline Pipeline Infrastructure"],
    "Unauthorized contractors": ["Pump / Compressor Units", "Control Room & SCADA Systems", "Valve Stations & Flow Control Systems"],
    "Surveillance and probing": ["Pump / Compressor Units", "Control Room & SCADA Systems", "Valve Stations & Flow Control Systems"],
    "Drone-enabled reconnaissance": ["Pump / Compressor Units", "Control Room & SCADA Systems", "Valve Stations & Flow Control Systems", "Mainline Pipeline Infrastructure"],
    "Insider threat": ["Pump / Compressor Units", "Control Room & SCADA Systems", "Valve Stations & Flow Control Systems"],
    "Coordinated physical attack": ["Pump / Compressor Units", "Control Room & SCADA Systems", "Mainline Pipeline Infrastructure"],
    "Vehicle strikes": ["Pump / Compressor Units", "Control Room & SCADA Systems", "Valve Stations & Flow Control Systems"],
    "Natural hazards": ["Pump / Compressor Units", "Mainline Pipeline Infrastructure", "Control Room & SCADA Systems", "Valve Stations & Flow Control Systems"],
    "Hazardous materials release": ["Pump / Compressor Units", "Mainline Pipeline Infrastructure", "Valve Stations & Flow Control Systems"]
  },
  "LNG & Gasification": {
    "Material theft": ["LNG Storage Tanks", "Liquefaction / Regasification Trains", "Marine / Truck Loading Facilities"],
    "Equipment theft": ["Liquefaction / Regasification Trains", "Control Room & Safety Systems", "Marine / Truck Loading Facilities"],
    "Opportunistic vandalism": ["Marine / Truck Loading Facilities", "LNG Storage Tanks"],
    "Arson / Intentional Fire": ["LNG Storage Tanks", "Liquefaction / Regasification Trains", "Marine / Truck Loading Facilities"],
    "Protest-related damage": ["LNG Storage Tanks", "Marine / Truck Loading Facilities", "Liquefaction / Regasification Trains"],
    "Curiosity and exploration": ["LNG Storage Tanks", "Liquefaction / Regasification Trains", "Marine / Truck Loading Facilities"],
    "Encampments": ["Marine / Truck Loading Facilities"],
    "Unauthorized contractors": ["Liquefaction / Regasification Trains", "Control Room & Safety Systems", "LNG Storage Tanks"],
    "Surveillance and probing": ["LNG Storage Tanks", "Control Room & Safety Systems", "Liquefaction / Regasification Trains"],
    "Drone-enabled reconnaissance": ["LNG Storage Tanks", "Control Room & Safety Systems", "Marine / Truck Loading Facilities", "Liquefaction / Regasification Trains"],
    "Insider threat": ["LNG Storage Tanks", "Liquefaction / Regasification Trains", "Control Room & Safety Systems"],
    "Coordinated physical attack": ["LNG Storage Tanks", "Liquefaction / Regasification Trains", "Control Room & Safety Systems"],
    "Vehicle strikes": ["LNG Storage Tanks", "Control Room & Safety Systems", "Marine / Truck Loading Facilities"],
    "Natural hazards": ["LNG Storage Tanks", "Liquefaction / Regasification Trains", "Marine / Truck Loading Facilities", "Control Room & Safety Systems"],
    "Hazardous materials release": ["LNG Storage Tanks", "Liquefaction / Regasification Trains"]
  },
  "Renewables": {
    "Material theft": ["Generation Arrays (Solar Panels / Wind Turbines)", "Inverters & Power Conversion Systems", "Grid Interconnection & Substation"],
    "Equipment theft": ["Inverters & Power Conversion Systems", "Energy Storage Systems (BESS)"],
    "Opportunistic vandalism": ["Generation Arrays (Solar Panels / Wind Turbines)"],
    "Arson / Intentional Fire": ["Generation Arrays (Solar Panels / Wind Turbines)", "Energy Storage Systems (BESS)"],
    "Protest-related damage": ["Generation Arrays (Solar Panels / Wind Turbines)", "Grid Interconnection & Substation"],
    "Curiosity and exploration": ["Generation Arrays (Solar Panels / Wind Turbines)", "Energy Storage Systems (BESS)"],
    "Encampments": ["Generation Arrays (Solar Panels / Wind Turbines)"],
    "Unauthorized contractors": ["Inverters & Power Conversion Systems", "Energy Storage Systems (BESS)", "Grid Interconnection & Substation"],
    "Surveillance and probing": ["Energy Storage Systems (BESS)", "Grid Interconnection & Substation"],
    "Drone-enabled reconnaissance": ["Generation Arrays (Solar Panels / Wind Turbines)", "Energy Storage Systems (BESS)", "Grid Interconnection & Substation"],
    "Insider threat": ["Inverters & Power Conversion Systems", "Energy Storage Systems (BESS)", "Grid Interconnection & Substation"],
    "Coordinated physical attack": ["Generation Arrays (Solar Panels / Wind Turbines)", "Energy Storage Systems (BESS)", "Grid Interconnection & Substation"],
    "Vehicle strikes": ["Generation Arrays (Solar Panels / Wind Turbines)", "Grid Interconnection & Substation"],
    "Natural hazards": ["Generation Arrays (Solar Panels / Wind Turbines)", "Inverters & Power Conversion Systems", "Energy Storage Systems (BESS)", "Grid Interconnection & Substation"]
  },
  "Water / Wastewater": {
    "Material theft": ["Pumping Stations", "Treatment Process Systems", "Chemical Storage & Handling Systems"],
    "Equipment theft": ["Pumping Stations", "Control Room & SCADA Systems", "Treatment Process Systems"],
    "Opportunistic vandalism": ["Treatment Process Systems", "Pumping Stations", "Chemical Storage & Handling Systems"],
    "Arson / Intentional Fire": ["Treatment Process Systems", "Chemical Storage & Handling Systems", "Pumping Stations"],
    "Protest-related damage": ["Treatment Process Systems", "Pumping Stations", "Chemical Storage & Handling Systems"],
    "Curiosity and exploration": ["Treatment Process Systems", "Pumping Stations"],
    "Encampments": ["Treatment Process Systems"],
    "Unauthorized contractors": ["Treatment Process Systems", "Control Room & SCADA Systems", "Chemical Storage & Handling Systems"],
    "Surveillance and probing": ["Control Room & SCADA Systems", "Chemical Storage & Handling Systems", "Treatment Process Systems"],
    "Drone-enabled reconnaissance": ["Treatment Process Systems", "Control Room & SCADA Systems", "Chemical Storage & Handling Systems", "Pumping Stations"],
    "Insider threat": ["Treatment Process Systems", "Control Room & SCADA Systems", "Chemical Storage & Handling Systems"],
    "Coordinated physical attack": ["Treatment Process Systems", "Control Room & SCADA Systems", "Pumping Stations"],
    "Vehicle strikes": ["Treatment Process Systems", "Control Room & SCADA Systems", "Chemical Storage & Handling Systems"],
    "Natural hazards": ["Treatment Process Systems", "Pumping Stations", "Chemical Storage & Handling Systems", "Control Room & SCADA Systems"],
    "Hazardous materials release": ["Treatment Process Systems", "Chemical Storage & Handling Systems"]
  }
};


// ─── Entity / Location / Visibility Risk Context ─────────────────────────────
const ENTITY_CATEGORIES = {
  government:       { label:"Government Building",              increasedThreats:["Insider threat","Coordinated physical attack","Protest-related damage","Drone-enabled reconnaissance"], decreasedThreats:[],                                                                                                                  note:"Government adjacency elevates bomb threat exposure, protest spillover, and targeted attack risk." },
  courthouse:       { label:"Courthouse / Justice Facility",    increasedThreats:["Coordinated physical attack","Protest-related damage"],                                                    decreasedThreats:[],                                                                                                                  note:"Courthouses attract demonstrations and threat actors targeting legal proceedings." },
  police:           { label:"Police Station",                   increasedThreats:[],                                                                                                         decreasedThreats:["Material theft","Equipment theft","Opportunistic vandalism","Curiosity and exploration","Encampments","Coordinated physical attack"], note:"Proximity to law enforcement improves deterrence and reduces opportunistic crime likelihood." },
  fire_station:     { label:"Fire Station",                     increasedThreats:[],                                                                                                         decreasedThreats:["Arson / Intentional Fire","Hazardous materials release","Natural hazards"],                                        note:"Fire station proximity improves emergency response to fire, hazmat, and natural hazard events." },
  school:           { label:"School / University",              increasedThreats:["Curiosity and exploration","Opportunistic vandalism","Encampments"],                                      decreasedThreats:[],                                                                                                                  note:"Educational institutions increase after-hours trespass, vandalism, and foot traffic exposure." },
  hospital:         { label:"Hospital / Medical Center",        increasedThreats:["Vehicle strikes"],                                                                                        decreasedThreats:["Natural hazards","Hazardous materials release"],                                                                   note:"Hospitals generate high vehicle traffic. Emergency services proximity reduces hazmat and natural hazard impact." },
  bank:             { label:"Bank / Financial Institution",     increasedThreats:["Material theft","Coordinated physical attack"],                                                           decreasedThreats:[],                                                                                                                  note:"Banks attract theft activity and may be co-targeted in coordinated criminal operations." },
  embassy:          { label:"Embassy / Consulate",              increasedThreats:["Insider threat","Protest-related damage","Coordinated physical attack","Drone-enabled reconnaissance"],  decreasedThreats:[],                                                                                                                  note:"Embassies are high-profile targets attracting protests, surveillance, and potential attack spillover." },
  place_of_worship: { label:"Place of Worship",                 increasedThreats:["Protest-related damage","Curiosity and exploration","Vehicle strikes"],                                   decreasedThreats:[],                                                                                                                  note:"Religious sites attract large gatherings and occasional demonstrations, increasing crowd-driven risk." },
  military:         { label:"Military Installation",            increasedThreats:["Surveillance and probing","Drone-enabled reconnaissance","Coordinated physical attack"],                  decreasedThreats:["Material theft","Opportunistic vandalism"],                                                                        note:"Military installations attract adversarial surveillance and may elevate the profile of adjacent infrastructure." },
  industrial:       { label:"Industrial Facility",              increasedThreats:["Hazardous materials release","Arson / Intentional Fire","Natural hazards"],                               decreasedThreats:[],                                                                                                                  note:"Adjacent industrial operations create fire, explosion, and hazmat spillover risk." },
  hotel:            { label:"Hotel / Lodging",                  increasedThreats:["Surveillance and probing","Unauthorized contractors"],                                                    decreasedThreats:[],                                                                                                                  note:"Hotels bring transient populations that facilitate extended surveillance of adjacent facilities." },
  aerodrome:        { label:"Airport / Airfield",               increasedThreats:["Drone-enabled reconnaissance","Coordinated physical attack","Surveillance and probing"],                  decreasedThreats:[],                                                                                                                  note:"Airports increase drone activity in the area and attract security threats affecting adjacent infrastructure." },
  transport:        { label:"Transit Hub",                      increasedThreats:["Curiosity and exploration","Encampments","Vehicle strikes"],                                              decreasedThreats:[],                                                                                                                  note:"Transit hubs generate foot traffic contributing to trespass, encampment, and vehicle access incidents." },
  critical_infra:   { label:"Adjacent Critical Infrastructure", increasedThreats:["Coordinated physical attack","Surveillance and probing"],                                                  decreasedThreats:[],                                                                                                                  note:"Proximity to other critical infrastructure increases cascading impact potential and coordinated attack risk." },
};

const LOCATION_RISK_CONTEXT = {
  "Urban":          { elevated:["Material theft","Equipment theft","Opportunistic vandalism","Protest-related damage","Curiosity and exploration","Encampments","Vehicle strikes","Unauthorized contractors"], reduced:["Drone-enabled reconnaissance","Natural hazards"], leNote:"Law enforcement response is typically faster in urban environments.", summary:"Urban environment elevates opportunistic crime, vandalism, and protest exposure due to population density and foot traffic." },
  "Suburban":       { elevated:["Unauthorized contractors","Surveillance and probing"],                                                                                                                        reduced:["Encampments","Protest-related damage"],             leNote:"Law enforcement response times are moderate in suburban areas.",              summary:"Suburban environment presents moderate, balanced risk with lower foot traffic than urban settings." },
  "Rural / Remote": { elevated:["Coordinated physical attack","Natural hazards","Insider threat","Drone-enabled reconnaissance","Arson / Intentional Fire","Material theft"],                                  reduced:["Opportunistic vandalism","Encampments","Protest-related damage","Vehicle strikes"], leNote:"Law enforcement response times are significantly extended — a critical factor in coordinated attack survivability.", summary:"Rural/remote facilities face elevated coordinated attack and natural hazard risk due to limited law enforcement response and reduced natural surveillance." },
};

const VISIBILITY_RISK_CONTEXT = {
  "High":   { elevated:["Protest-related damage","Surveillance and probing","Drone-enabled reconnaissance","Curiosity and exploration"], reduced:["Material theft","Equipment theft","Encampments","Insider threat"],                                  summary:"High road visibility increases protest and surveillance exposure, but natural surveillance from passers-by deters theft, encampments, and insider activity." },
  "Medium": { elevated:[],                                                                                                              reduced:[],                                                                                                                    summary:"Moderate road visibility presents balanced exposure — identifiable but not prominently observable." },
  "Low":    { elevated:["Material theft","Equipment theft","Insider threat","Encampments","Unauthorized contractors"],                  reduced:["Protest-related damage","Curiosity and exploration","Surveillance and probing"], summary:"Low road visibility reduces protest and casual trespass exposure, but limited natural surveillance makes theft, insider activity, and encampments harder to detect." },
};

const ADJACENCY_KEYWORDS = [
  { keywords:["government","federal building","state building","city hall","town hall","municipal building"], type:"government" },
  { keywords:["courthouse","court house","justice center","county court"],                                   type:"courthouse" },
  { keywords:["police","sheriff","law enforcement","police station"],                                        type:"police" },
  { keywords:["fire station","fire department","firehouse"],                                                 type:"fire_station" },
  { keywords:["school","university","college","campus","academy"],                                           type:"school" },
  { keywords:["hospital","medical center","clinic","healthcare"],                                            type:"hospital" },
  { keywords:["bank","credit union","financial institution"],                                                type:"bank" },
  { keywords:["embassy","consulate","diplomatic"],                                                           type:"embassy" },
  { keywords:["church","mosque","temple","synagogue","cathedral","place of worship"],                        type:"place_of_worship" },
  { keywords:["military","army","navy","air force","base","barracks","national guard"],                     type:"military" },
  { keywords:["industrial","factory","plant","refinery","manufacturing"],                                   type:"industrial" },
  { keywords:["hotel","motel","lodging","inn"],                                                             type:"hotel" },
  { keywords:["airport","airfield","airstrip","aerodrome"],                                                 type:"aerodrome" },
  { keywords:["transit","bus station","train station","metro","subway","rail station"],                      type:"transport" },
  { keywords:["pipeline","substation","transmission line","power plant","water treatment","pumping station","generating station","lng","refinery","critical infrastructure"], type:"critical_infra" },
];

const BLANK_CONTROL = { score: 0, notes: "" };

function getCritTier(score) {
  const n = parseInt(score) || 1;
  if (n >= 5) return { tier: "Severe / Mission-Critical", tc: "text-red-600",    bg: "bg-red-50",    bc: "border-red-300"    };
  if (n >= 4) return { tier: "High",                     tc: "text-orange-600", bg: "bg-orange-50", bc: "border-orange-300" };
  if (n >= 3) return { tier: "Moderate",                 tc: "text-yellow-600", bg: "bg-yellow-50", bc: "border-yellow-300" };
  if (n >= 2) return { tier: "Low",                      tc: "c-text-teal",   bg: "c-bg-light",   bc: "border-gray-300"   };
  return              { tier: "Minor",                   tc: "text-green-600",  bg: "bg-green-50",  bc: "border-green-300"  };
}

const INITIAL_STATE = {
  facility: {
    date: new Date().toISOString().split("T")[0],
    assessor: "",
    assessorEmail: "",
    clientName: "",
    facilityId: "",
    type: "",
    address: "",
    coordinates: "",
    gpsLoading: false,
    locationAttributes: "",
    adjacencyNotes: "",
    visibility: "",
    responseTime: "",
    nearbyEntities: [],
    entityLookupStatus: "idle",
  },
  criticality: { assetPresence: {}, assetScores: {}, assetPhotos: {} },
  controlPhotos: {},
  controls: {
    perimeter: {
      fencing:  { ...BLANK_CONTROL },
      gates:    { ...BLANK_CONTROL },
      signage:  { ...BLANK_CONTROL },
      lighting: { ...BLANK_CONTROL },
      bollards: { ...BLANK_CONTROL },
    },
    access: {
      locks:          { ...BLANK_CONTROL },
      cardReaders:    { ...BLANK_CONTROL },
      visitorMgmt:    { ...BLANK_CONTROL },
      credentialAcct: { ...BLANK_CONTROL },
    },
    detection: {
      cctv:       { ...BLANK_CONTROL },
      intrusion:  { ...BLANK_CONTROL },
      patrols:    { ...BLANK_CONTROL },
      drone:      { ...BLANK_CONTROL },
    },
    hardening: {
      enclosures: { ...BLANK_CONTROL },
      redundancy: { ...BLANK_CONTROL },
    },
    response: {
      monitoring:     { ...BLANK_CONTROL },
      security:       { ...BLANK_CONTROL },
      communications: { ...BLANK_CONTROL },
    },
  },
  threats: [],
  risks: [],
};

function getCtrlRating(n) {
  if (n === "N/A" || n === undefined || n === null) return { label: "Not Rated", tc: "text-gray-500", bg: "bg-gray-100" };
  const s = parseFloat(n);
  if (isNaN(s)) return { label: "Not Rated", tc: "text-gray-500", bg: "bg-gray-100" };
  if (s >= 5.0) return { label: "Robust",      tc: "text-green-700",  bg: "bg-green-100"  };
  if (s >= 4.0) return { label: "Strong",      tc: "text-green-600",  bg: "bg-green-50"   };
  if (s >= 3.0) return { label: "Adequate",    tc: "c-text-teal",   bg: "c-bg-light"    };
  if (s >= 2.0) return { label: "Weak",        tc: "text-yellow-600", bg: "bg-yellow-50"  };
  return              { label: "Ineffective", tc: "text-red-600",    bg: "bg-red-50"     };
}

function getRiskLevel(score) {
  if (score >= 10) return { level: "EXTREME", tc: "c-text-navy", bg: "c-bg-extreme", bc: "c-border-navy" };
  if (score >= 7)  return { level: "HIGH",    tc: "text-red-600",    bg: "bg-red-100",    bc: "border-red-500"    };
  if (score >= 4)  return { level: "MODERATE",tc: "text-yellow-600", bg: "bg-yellow-100", bc: "border-yellow-500" };
  return                   { level: "LOW",    tc: "text-green-600",  bg: "bg-green-100",  bc: "border-green-500"  };
}

// ─── Shared utility: map raw risk score (0-25) to intuitive display score (0-100) ──
// Ensures each risk level maps to a range users expect:
//   LOW (0-3.99)     → 0-29    HIGH (7-9.99)    → 60-79
//   MODERATE (4-6.99) → 30-59   EXTREME (10-25)  → 80-100
function getRiskDisplayScore(raw) {
  if (raw <= 0) return 0;
  if (raw < 4)  return Math.floor((raw / 4) * 30);
  if (raw < 7)  return 30 + Math.floor(((raw - 4) / 3) * 30);
  if (raw < 10) return 60 + Math.floor(((raw - 7) / 3) * 20);
  return Math.min(100, 80 + Math.floor(((raw - 10) / 15) * 21));
}

// ─── Shared utility: get all controls flat ────────────────────────────────────
function getAllControlsFlat(controls) {
  const result = [];
  Object.entries(controls).forEach(([catId, catControls]) => {
    Object.entries(catControls).forEach(([key, ctrl]) => {
      result.push({ category: catId, key, ...ctrl });
    });
  });
  return result;
}

// ─── Shared utility: control label lookup ─────────────────────────────────────
const CONTROL_LABELS = {
  fencing: "Fencing", gates: "Gates", signage: "Signage", lighting: "Lighting", bollards: "Bollards",
  locks: "Physical Locks", cardReaders: "Electronic Access Control", visitorMgmt: "Visitor Management",
  credentialAcct: "Identity & Access Management", cctv: "Video Surveillance", intrusion: "Intrusion Detection System",
  patrols: "Security Officer Presence", monitoring: "Security Operations Center (SOC)", drone: "Drone Detection",
  enclosures: "Hardened Enclosures", redundancy: "Redundancy",
  security: "Security & LE Response", communications: "Communication Systems"
};
function getControlLabel(key) { return CONTROL_LABELS[key] || key; }

// ─── Shared utility: control effectiveness with DBT logic ─────────────────────
// LE Response (security) acts as a MODIFIER, not the baseline.
// Baseline comes from physical, access, and detection controls only.
function calculateControlEffectiveness(threatName, selectedControlKeys, controls, responseTime) {
  const allControls = getAllControlsFlat(controls);
  const selectedControls = selectedControlKeys
    .map(key => allControls.find(c => c.key === key))
    .filter(Boolean)
    .filter(c => c.score > 0);

  if (selectedControls.length === 0) return 1;

  // Separate response/modifier controls from physical/detection controls
  const modifierKeys = ["security", "monitoring", "communications"];
  const physicalControls = selectedControls.filter(c => !modifierKeys.includes(c.key));
  const responseScore = selectedControls.find(c => c.key === "security")?.score || 0;
  const socScore = selectedControls.find(c => c.key === "monitoring")?.score || 0;
  const commsScore = selectedControls.find(c => c.key === "communications")?.score || 0;
  const rt = parseInt(responseTime) || 999;

  // Baseline effectiveness comes from physical/detection controls
  // Uses weighted average: highest control counts more, but others contribute
  let baseEff;
  if (physicalControls.length === 0) {
    // Only modifier controls exist — use their average but cap it lower
    baseEff = selectedControls.reduce((s, c) => s + c.score, 0) / selectedControls.length;
    baseEff = Math.min(baseEff, 2.5);
  } else if (physicalControls.length === 1) {
    baseEff = physicalControls[0].score;
  } else {
    // Weighted: best control counts 50%, average of the rest counts 50%
    const sorted = physicalControls.map(c => c.score).sort((a, b) => b - a);
    const best = sorted[0];
    const restAvg = sorted.slice(1).reduce((s, v) => s + v, 0) / (sorted.length - 1);
    baseEff = (best * 0.5) + (restAvg * 0.5);
  }

  // SOC modifier: weak monitoring reduces detection effectiveness (multiplier, not hard cap)
  if (socScore > 0 && socScore <= 2) baseEff = baseEff * 0.85;

  // SOC bonus: strong monitoring boosts effectiveness slightly
  if (socScore >= 4) baseEff = Math.min(5, baseEff * 1.1);

  // Comms penalty: weak communications limits coordination
  if (commsScore > 0 && commsScore < baseEff - 0.5) baseEff = baseEff * 0.9;

  // LE Response modifier: only applies when physical controls are present
  // LE response alone cannot provide meaningful control effectiveness
  const attackDuration = THREAT_CONTROL_MAP[threatName]?.duration;
  if (responseScore > 0 && physicalControls.length > 0 && attackDuration !== null && attackDuration !== undefined) {
    if (rt <= attackDuration) {
      // Response arrives before attack completes — meaningful bonus
      baseEff = Math.min(5, baseEff + (responseScore * 0.15));
    } else if (rt <= attackDuration * 2) {
      // Response arrives late but within 2x — minimal bonus
      baseEff = Math.min(5, baseEff + (responseScore * 0.05));
    }
    // If response time > 2x attack duration, LE response adds nothing
  }

  return Math.max(1, Math.min(5, baseEff));
}

function avgScore(controls) {
  const vals = Object.values(controls).map((c) => c.score).filter(s => s > 0);
  if (vals.length === 0) return "N/A";
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

export default function App() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => {
    try {
      const saved = localStorage.getItem("psr-assessment-data");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate it has expected structure
        if (parsed && parsed.facility && parsed.controls) {
          // Migrate old single-string photo format to new array format
          if (parsed.criticality && parsed.criticality.assetPhotos) {
            for (const key of Object.keys(parsed.criticality.assetPhotos)) {
              if (typeof parsed.criticality.assetPhotos[key] === "string") {
                parsed.criticality.assetPhotos[key] = [{ name: parsed.criticality.assetPhotos[key], data: "", timestamp: 0 }];
              }
            }
          }
          if (parsed.controlPhotos) {
            for (const key of Object.keys(parsed.controlPhotos)) {
              if (typeof parsed.controlPhotos[key] === "string") {
                parsed.controlPhotos[key] = [{ name: parsed.controlPhotos[key], data: "", timestamp: 0 }];
              }
            }
          }
          return parsed;
        }
      }
    } catch {}
    return INITIAL_STATE;
  });
  const [showResumePrompt, setShowResumePrompt] = useState(() => {
    try {
      const saved = localStorage.getItem("psr-assessment-data");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Show resume prompt if there's meaningful saved data
        if (parsed && parsed.facility && (parsed.facility.facilityId || parsed.facility.clientName || parsed.facility.type)) {
          return true;
        }
      }
    } catch {}
    return false;
  });
  const clearSavedData = () => { try { localStorage.removeItem("psr-assessment-data"); } catch {} setD(INITIAL_STATE); setShowResumePrompt(false); };
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  const setFac = React.useCallback((f, v) => setD((p) => ({ ...p, facility: { ...p.facility, [f]: v } })), []);

  const setAsset = (asset, val) =>
    setD((p) => ({
      ...p,
      criticality: {
        ...p.criticality,
        assetScores: { ...p.criticality.assetScores, [asset]: parseInt(val) },
      },
    }));

  const setAssetPresence = (asset, present) =>
    setD((p) => ({
      ...p,
      criticality: {
        ...p.criticality,
        assetPresence: { ...p.criticality.assetPresence, [asset]: present },
      },
    }));

  const handleAssetPhotoUpload = (asset, files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    let processed = 0;
    const results = [];
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        results.push({ name: file.name, data: e.target.result, timestamp: Date.now() });
        processed++;
        if (processed === fileArray.length && results.length > 0) {
          setD((p) => {
            const existing = (p.criticality.assetPhotos || {})[asset] || [];
            return {
              ...p,
              criticality: {
                ...p.criticality,
                assetPhotos: { ...(p.criticality.assetPhotos || {}), [asset]: [...existing, ...results] },
              },
            };
          });
        }
      };
      reader.onerror = () => { processed++; };
      reader.readAsDataURL(file);
    });
  };

  const removeAssetPhoto = (asset, index) => {
    setD((p) => {
      const photos = [...((p.criticality.assetPhotos || {})[asset] || [])];
      photos.splice(index, 1);
      return {
        ...p,
        criticality: {
          ...p.criticality,
          assetPhotos: { ...(p.criticality.assetPhotos || {}), [asset]: photos },
        },
      };
    });
  };

  const handleControlPhotoUpload = (controlKey, files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    let processed = 0;
    const results = [];
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        results.push({ name: file.name, data: e.target.result, timestamp: Date.now() });
        processed++;
        if (processed === fileArray.length && results.length > 0) {
          setD((p) => {
            const existing = (p.controlPhotos || {})[controlKey] || [];
            return {
              ...p,
              controlPhotos: { ...(p.controlPhotos || {}), [controlKey]: [...existing, ...results] },
            };
          });
        }
      };
      reader.onerror = () => { processed++; };
      reader.readAsDataURL(file);
    });
  };

  const removeControlPhoto = (controlKey, index) => {
    setD((p) => {
      const photos = [...((p.controlPhotos || {})[controlKey] || [])];
      photos.splice(index, 1);
      return {
        ...p,
        controlPhotos: { ...(p.controlPhotos || {}), [controlKey]: photos },
      };
    });
  };

  const setCtrl = (cat, ctrl, field, val) =>
    setD((p) => ({
      ...p,
      controls: {
        ...p.controls,
        [cat]: {
          ...p.controls[cat],
          [ctrl]: { ...p.controls[cat][ctrl], [field]: field === "score" ? parseInt(val) : val },
        },
      },
    }));

  const toggleThreat = (name) => {
    if (d.threats.find((t) => t.name === name)) {
      setD((p) => ({ ...p, threats: p.threats.filter((t) => t.name !== name), risks: p.risks.filter((r) => r.threat !== name) }));
    } else {
      setD((p) => ({ ...p, threats: [...p.threats, { name, evidence: [], likelihood: 3 }] }));
    }
  };

  const setEvidence = (name, ev) =>
    setD((p) => ({ ...p, threats: p.threats.map((t) => (t.name === name ? { ...t, evidence: ev } : t)) }));

  const setThreatLikelihood = (name, likelihood) =>
    setD((p) => ({ ...p, threats: p.threats.map((t) => (t.name === name ? { ...t, likelihood: parseInt(likelihood) } : t)) }));

  const setRisk = (threat, f, v) =>
    setD((p) => ({ ...p, risks: p.risks.map((r) => (r.threat === threat ? { ...r, [f]: v } : r)) }));


  // ── Nearby entity lookup (OpenStreetMap Nominatim + Overpass) ──────────────
  const lookupNearbyEntities = async () => {
    const address = d.facility.address;
    const coordStr = d.facility.coordinates;
    let lat, lon;
    if (coordStr) {
      const parts = coordStr.split(",").map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { [lat, lon] = parts; }
    }
    if ((!lat || !lon) && address) {
      setFac("entityLookupStatus", "loading");
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, { headers:{ "Accept":"application/json" } });
        const geo = await res.json();
        if (geo.length > 0) { lat = parseFloat(geo[0].lat); lon = parseFloat(geo[0].lon); setFac("coordinates", `${lat.toFixed(6)}, ${lon.toFixed(6)}`); }
        else { setFac("entityLookupStatus","error"); return; }
      } catch { setFac("entityLookupStatus","error"); return; }
    }
    if (!lat || !lon) { alert("Enter an address or GPS coordinates first."); return; }
    setFac("entityLookupStatus","loading");
    const radius = 600;
    const q = `[out:json][timeout:15];(node["amenity"~"^(government|courthouse|townhall|police|fire_station|school|university|college|hospital|bank|embassy|place_of_worship)$"](around:${radius},${lat},${lon});node["landuse"~"^(military|industrial)$"](around:${radius},${lat},${lon});node["tourism"="hotel"](around:${radius},${lat},${lon});node["aeroway"="aerodrome"](around:${radius},${lat},${lon});way["amenity"~"^(government|courthouse|townhall|police|fire_station|school|university|college|hospital|bank|embassy|place_of_worship)$"](around:${radius},${lat},${lon});way["landuse"~"^(military|industrial)$"](around:${radius},${lat},${lon}););out center body;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter",{ method:"POST", body:q });
      const json = await res.json();
      const typeMap = { government:"government",townhall:"government",courthouse:"courthouse",police:"police",fire_station:"fire_station",school:"school",university:"school",college:"school",hospital:"hospital",bank:"bank",embassy:"embassy",place_of_worship:"place_of_worship",military:"military",industrial:"industrial",hotel:"hotel",aerodrome:"aerodrome" };
      const haversine = (la,lo) => { const R=6371000,toRad=v=>v*Math.PI/180,dLat=toRad(la-lat),dLon=toRad(lo-lon),a=Math.sin(dLat/2)**2+Math.cos(toRad(lat))*Math.cos(toRad(la))*Math.sin(dLon/2)**2; return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))); };
      const seen = new Set();
      const entities = json.elements.map(el => {
        const tags = el.tags||{}; const raw = tags.amenity||tags.landuse||tags.tourism||tags.aeroway;
        const type = typeMap[raw]; if (!type||!ENTITY_CATEGORIES[type]) return null;
        const name = tags.name||ENTITY_CATEGORIES[type].label;
        const key = `${type}|${name}`; if (seen.has(key)) return null; seen.add(key);
        const elLat = el.lat??el.center?.lat; const elLon = el.lon??el.center?.lon;
        return { id:el.id, type, label:ENTITY_CATEGORIES[type].label, name, distance:elLat?haversine(elLat,elLon):null, confirmed:false };
      }).filter(Boolean).sort((a,b)=>(a.distance??9999)-(b.distance??9999));
      setFac("nearbyEntities", entities);
      setFac("entityLookupStatus", entities.length ? "done" : "none");
    } catch { setFac("entityLookupStatus","error"); }
  };

  const toggleNearbyEntity = (id) => setD(p => ({
    ...p, facility: { ...p.facility, nearbyEntities: p.facility.nearbyEntities.map(e => e.id===id ? {...e,confirmed:!e.confirmed} : e) }
  }));

  // Parse assessor adjacency notes for known entity keywords
  const parseAdjacencyEntities = () => {
    const notes = (d.facility.adjacencyNotes||"").toLowerCase();
    const found = []; const seenTypes = new Set();
    ADJACENCY_KEYWORDS.forEach(({keywords,type}) => {
      if (seenTypes.has(type)) return;
      if (keywords.some(kw => notes.includes(kw))) {
        const cat = ENTITY_CATEGORIES[type];
        if (cat) { found.push({ type, label:cat.label, name:cat.label, fromNotes:true }); seenTypes.add(type); }
      }
    });
    return found;
  };

  // Get context flags (location + visibility + entities + adjacency notes) for a threat
  const getContextualRiskFlags = (threatName) => {
    const flags = [];
    const locAttr = d.facility.locationAttributes;
    const visibility = d.facility.visibility;
    const confirmedEntities = (d.facility.nearbyEntities||[]).filter(e=>e.confirmed);
    const adjacencyEntities = parseAdjacencyEntities();
    const allEntities = [...confirmedEntities, ...adjacencyEntities.filter(ae=>!confirmedEntities.some(ce=>ce.type===ae.type))];
    if (locAttr && LOCATION_RISK_CONTEXT[locAttr]) {
      const ctx = LOCATION_RISK_CONTEXT[locAttr];
      if (ctx.elevated.includes(threatName)) flags.push({ dir:"up",   label:locAttr, note:`${locAttr} setting elevates this threat` });
      if (ctx.reduced.includes(threatName))  flags.push({ dir:"down", label:locAttr, note:`${locAttr} setting reduces this threat` });
    }
    if (visibility && VISIBILITY_RISK_CONTEXT[visibility]) {
      const ctx = VISIBILITY_RISK_CONTEXT[visibility];
      if (ctx.elevated.includes(threatName)) flags.push({ dir:"up",   label:`${visibility} visibility`, note:`${visibility} road visibility increases exposure` });
      if (ctx.reduced.includes(threatName))  flags.push({ dir:"down", label:`${visibility} visibility`, note:`${visibility} road visibility reduces exposure` });
    }
    allEntities.forEach(entity => {
      const cat = ENTITY_CATEGORIES[entity.type];
      if (!cat) return;
      if (cat.increasedThreats.includes(threatName)) flags.push({ dir:"up",   label:entity.name||entity.label, note:`Adjacent ${entity.label.toLowerCase()} elevates this threat` });
      if (cat.decreasedThreats.includes(threatName)) flags.push({ dir:"down", label:entity.name||entity.label, note:`Adjacent ${entity.label.toLowerCase()} reduces this threat` });
    });
    return flags;
  };

  // ── Auto-initialize risk entries when threats are added ────────────────────
  useEffect(() => {
    const missing = d.threats.filter(threat => !d.risks.find(r => r.threat === threat.name));
    if (missing.length === 0) return;
    const allCtrl = getAllControlsFlat(d.controls);
    const presentAssets = Object.entries(d.criticality.assetPresence)
      .filter(([_, present]) => present === true)
      .map(([assetName]) => ({ name: assetName, criticality: d.criticality.assetScores[assetName] || 3 }));
    const newRisks = missing.map(threat => {
      const mapping = THREAT_CONTROL_MAP[threat.name];
      const autoControls = mapping?.controls || [];
      const availableControls = autoControls.filter(ctrlKey => {
        const ctrl = allCtrl.find(c => c.key === ctrlKey);
        return ctrl && ctrl.score > 0;
      });
      const relevantAssetNames = THREAT_ASSET_MAP[d.facility.type]?.[threat.name] || [];
      const relevantAssets = presentAssets.filter(a => relevantAssetNames.includes(a.name));
      return { threat: threat.name, likelihood: threat.likelihood || 3, affectedAssets: relevantAssets, selectedControls: availableControls, treatment: "", estimatedCost: "", priority: "", owner: "", targetDate: "" };
    });
    setD(p => ({ ...p, risks: [...p.risks, ...newRisks] }));
  }, [d.threats, d.controls, d.criticality, d.facility.type]);

  // ── Re-sync selectedControls when control scores change ────────────────────
  // Ensures that controls scored AFTER risk entries were created get auto-checked
  useEffect(() => {
    if (d.risks.length === 0) return;
    const allCtrl = getAllControlsFlat(d.controls);
    setD(p => {
      let updated = false;
      const updatedRisks = p.risks.map(risk => {
        const mapping = THREAT_CONTROL_MAP[risk.threat];
        if (!mapping) return risk;
        const autoControls = mapping.controls || [];
        // Find controls that should be selected: mapped to this threat AND scored > 0
        const shouldBeSelected = autoControls.filter(ctrlKey => {
          const ctrl = allCtrl.find(c => c.key === ctrlKey);
          return ctrl && ctrl.score > 0;
        });
        // Preserve any user-added controls that aren't in the auto-map
        const currentSelected = risk.selectedControls || [];
        const userAdded = currentSelected.filter(k => !autoControls.includes(k));
        const newSelected = [...new Set([...shouldBeSelected, ...userAdded])];
        // Remove any controls whose score dropped back to 0
        const filtered = newSelected.filter(k => {
          const ctrl = allCtrl.find(c => c.key === k);
          return ctrl && ctrl.score > 0;
        });
        if (JSON.stringify(filtered.sort()) !== JSON.stringify([...currentSelected].sort())) {
          updated = true;
          return { ...risk, selectedControls: filtered };
        }
        return risk;
      });
      return updated ? { ...p, risks: updatedRisks } : p;
    });
  }, [d.controls]);

  // ── localStorage persistence (debounced) ────────────────────────────────────
  const [saveWarning, setSaveWarning] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("psr-assessment-data", JSON.stringify(d));
        if (saveWarning) setSaveWarning("");
      } catch (e) {
        setSaveWarning("Auto-save failed — storage limit reached. Your photos may not persist if you close this page. Consider exporting your report now.");
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [d]);

  const captureGPS = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }
    setFac("gpsLoading", true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setFac("coordinates", `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`); setFac("gpsLoading", false); },
      () => { alert("Unable to get location. Check permissions."); setFac("gpsLoading", false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── HTML escape utility for safe report generation ─────────────────────────
  const esc = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  };

  const exportReport = () => {
    // Risk tolerance threshold mapping: tolerance 1=high accept, 5=very low accept
    const toleranceThresholds = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 };
    const riskToleranceValue = d.facility.riskTolerance || 3;
    const toleranceThreshold = toleranceThresholds[riskToleranceValue];

    // Calculate risks with scores for the report (using shared utilities)
    const risksWithScores = d.risks.map(risk => {
      const threat = d.threats.find(t => t.name === risk.threat);
      if (!threat || !risk.affectedAssets || risk.affectedAssets.length === 0) return null;

      const maxCrit = Math.max(...risk.affectedAssets.map(a => a.criticality));
      const controlEff = risk.selectedControls.length > 0
        ? calculateControlEffectiveness(threat.name, risk.selectedControls, d.controls, d.facility.responseTime)
        : 1;
      const inherentRisk = maxCrit * threat.likelihood;
      const residualRisk = inherentRisk > 0 ? inherentRisk / controlEff : 0;
      const rl = getRiskLevel(residualRisk);
      const exceedsTolerance = residualRisk >= toleranceThreshold;

      return { ...risk, residualRisk, maxCrit, likelihood: threat.likelihood, riskLevel: rl.level, exceedsTolerance };
    }).filter(Boolean);

    const sortedRisks = [...risksWithScores].sort((a, b) => b.residualRisk - a.residualRisk);
    const highPri = sortedRisks.filter((r) => r.residualRisk >= 7);
    const exceedsToleranceCount = sortedRisks.filter(r => r.exceedsTolerance).length;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Security Risk Assessment Report - ${esc(d.facility.facilityId) || 'Facility'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #0E2C49; border-bottom: 3px solid #C2090E; padding-bottom: 10px; }
    h2 { color: #0E2C49; margin-top: 30px; border-bottom: 2px solid #8D98AC; padding-bottom: 5px; }
    h3 { color: #054163; margin-top: 20px; }
    .header { background: #EEF2F4; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { padding: 5px 0; }
    .label { font-weight: bold; }
    .risk-extreme { background: #d0d9e3; border-left: 4px solid #0E2C49; padding: 15px; margin: 10px 0; }
    .risk-high { background: #fef2f2; border-left: 4px solid #C2090E; padding: 15px; margin: 10px 0; }
    .risk-moderate { background: #fefce8; border-left: 4px solid #ca8a04; padding: 15px; margin: 10px 0; }
    .risk-low { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 10px 0; }
    .gap-critical { background: #fef2f2; border: 1px solid #C2090E; padding: 15px; margin: 10px 0; border-radius: 6px; }
    .gap-warning { background: #fefce8; border: 1px solid #fde047; padding: 15px; margin: 10px 0; border-radius: 6px; }
    .recommendation { background: #EEF2F4; padding: 12px; margin: 8px 0; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #8D98AC; padding: 10px; text-align: left; }
    th { background: #EEF2F4; font-weight: bold; }
    .note { font-style: italic; color: #6b7280; font-size: 0.9em; margin-top: 5px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Physical Security Risk Assessment Report</h1>
  
  <div class="header">
    <h2>Facility Information</h2>
    <div class="info-grid">
      <div class="info-item"><span class="label">Client:</span> ${esc(d.facility.clientName) || 'Not specified'}</div>
      <div class="info-item"><span class="label">Facility ID:</span> ${esc(d.facility.facilityId) || 'Not specified'}</div>
      <div class="info-item"><span class="label">Subvertical:</span> ${d.facility.type || 'Not specified'}</div>
      <div class="info-item"><span class="label">Assessment Date:</span> ${esc(d.facility.date) || 'Not specified'}</div>
      <div class="info-item"><span class="label">Assessed By:</span> ${esc(d.facility.assessor) || 'Not specified'}</div>
      <div class="info-item"><span class="label">Assessor Email:</span> ${esc(d.facility.assessorEmail) || 'Not specified'}</div>
      <div class="info-item"><span class="label">LE Response Time:</span> ${d.facility.responseTime ? esc(d.facility.responseTime) + ' min' : 'Not specified'}</div>
    </div>
    ${d.facility.locationAttributes || d.facility.adjacencyNotes ? `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
      <h3 style="margin-top: 10px;">Site Context</h3>
      ${d.facility.locationAttributes ? `<p><span class="label">Location Classification:</span> ${d.facility.locationAttributes}</p>` : ''}
      ${d.facility.locationAttributes && LOCATION_RISK_CONTEXT[d.facility.locationAttributes] ? `<p class="note">${LOCATION_RISK_CONTEXT[d.facility.locationAttributes].leNote}</p>` : ''}
      ${d.facility.visibility ? `<p><span class="label">Road Visibility:</span> ${d.facility.visibility}</p>` : ''}
      ${d.facility.adjacencyNotes ? `<p><span class="label">Assessor Adjacency Notes:</span> ${esc(d.facility.adjacencyNotes)}</p>` : ''}
    </div>
    ` : ''}
  </div>

  ${(() => {
    const locAttr = d.facility.locationAttributes;
    const visibility = d.facility.visibility;
    const confirmedEntities = (d.facility.nearbyEntities||[]).filter(e=>e.confirmed);
    const adjKeywordEntities = (() => {
      const notes = (d.facility.adjacencyNotes||"").toLowerCase();
      const found=[]; const seenTypes=new Set();
      ADJACENCY_KEYWORDS.forEach(({keywords,type})=>{
        if(seenTypes.has(type)) return;
        if(keywords.some(kw=>notes.includes(kw))){const cat=ENTITY_CATEGORIES[type];if(cat){found.push({type,label:cat.label,name:cat.label,fromNotes:true});seenTypes.add(type);}}
      });
      return found;
    })();
    const allEntities = [...confirmedEntities, ...adjKeywordEntities.filter(ae=>!confirmedEntities.some(ce=>ce.type===ae.type))];
    const locCtx = locAttr && LOCATION_RISK_CONTEXT[locAttr];
    const visCtx = visibility && VISIBILITY_RISK_CONTEXT[visibility];
    if (!locCtx && !visCtx && !allEntities.length) return '';
    return `
  <h2>Site Context &amp; Environmental Risk Factors</h2>
  <p>The following site-specific factors were identified during the assessment. They inform threat likelihood judgments and should be considered when prioritizing remediation actions.</p>

  ${locCtx ? `
  <div class="recommendation">
    <h3>Location Classification: ${locAttr}</h3>
    <p>${locCtx.summary}</p>
    <p><em>${locCtx.leNote}</em></p>
    ${locCtx.elevated.length ? `<p><strong>Threats elevated in this environment:</strong> ${locCtx.elevated.join(", ")}</p>` : ''}
    ${locCtx.reduced.length  ? `<p><strong>Threats reduced in this environment:</strong> ${locCtx.reduced.join(", ")}</p>` : ''}
  </div>` : ''}

  ${visCtx ? `
  <div class="recommendation">
    <h3>Road Visibility: ${visibility}</h3>
    <p>${visCtx.summary}</p>
    ${visCtx.elevated.length ? `<p><strong>Threats elevated by this visibility level:</strong> ${visCtx.elevated.join(", ")}</p>` : ''}
    ${visCtx.reduced.length  ? `<p><strong>Threats reduced by this visibility level:</strong> ${visCtx.reduced.join(", ")}</p>` : ''}
  </div>` : ''}

  ${allEntities.length ? `
  <h3>Adjacent Risk Entities (${allEntities.length} identified)</h3>
  <table>
    <tr>
      <th>Entity</th><th>Source</th><th>Elevated Threats</th><th>Reduced Threats</th><th>Risk Note</th>
    </tr>
    ${allEntities.map(e=>{
      const cat=ENTITY_CATEGORIES[e.type]||{};
      return `<tr>
        <td><strong>${e.name||e.label}</strong><br><span style="color:#6b7280;font-size:0.85em;">${e.label}</span></td>
        <td>${e.fromNotes?'Assessor notes':e.distance?`Detected (${Math.round(e.distance * 3.28084)}ft)`:'Detected'}</td>
        <td>${(cat.increasedThreats||[]).join("<br>")||'—'}</td>
        <td>${(cat.decreasedThreats||[]).join("<br>")||'—'}</td>
        <td style="font-size:0.9em;">${cat.note||''}</td>
      </tr>`;
    }).join('')}
  </table>` : ''}

  ${d.facility.adjacencyNotes ? `
  <div class="recommendation">
    <h3>Assessor Adjacency Notes</h3>
    <p>${esc(d.facility.adjacencyNotes)}</p>
  </div>` : ''}
  `;
  })()}

  <h2>Executive Summary</h2>
  <p>This assessment identified <strong>${sortedRisks.length} total risks</strong> across the facility. Organization risk tolerance is set to <strong>${riskToleranceValue}/5</strong>; <strong>${exceedsToleranceCount}</strong> risk${exceedsToleranceCount !== 1 ? 's' : ''} exceed${exceedsToleranceCount === 1 ? 's' : ''} this threshold.</p>
  <ul>
    <li><strong>${sortedRisks.filter(r => r.residualRisk >= 10).length} EXTREME</strong> risks (Score 80-100) — Immediate treatment required</li>
    <li><strong>${sortedRisks.filter(r => r.residualRisk >= 7 && r.residualRisk < 10).length} HIGH</strong> risks (Score 60-79) — Treatment plan required</li>
    <li><strong>${sortedRisks.filter(r => r.residualRisk >= 4 && r.residualRisk < 7).length} MODERATE</strong> risks (Score 30-59) — Monitor and consider treatment</li>
    <li><strong>${sortedRisks.filter(r => r.residualRisk < 4).length} LOW</strong> risks (Score 0-29) — Accept or minimal controls</li>
  </ul>

  ${highPri.length > 0 ? `
  <h2>Top Priority Risks Requiring Treatment</h2>
  ${highPri.map((r, i) => {
    const flags = getContextualRiskFlags(r.threat);
    const flagsHtml = flags.length > 0 ? `<p style="margin:5px 0;"><strong>Site Context Factors:</strong> ${flags.map(f => `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:0.8em;margin:2px;${f.dir==='up'?'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa':'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0'}">${f.dir==='up'?'↑':'↓'} ${f.label}</span>`).join(' ')}</p>` : '';
    return `
    <div class="risk-${r.riskLevel.toLowerCase()}">
      <h3>#${i+1} ${r.threat} - ${r.riskLevel}${r.exceedsTolerance ? ' <span style="background:#dc2626;color:white;padding:2px 8px;border-radius:12px;font-size:0.7em;">EXCEEDS TOLERANCE</span>' : ''}</h3>
      ${flagsHtml}
      <p><strong>Risk Level:</strong> ${r.riskLevel} — Risk Index: ${getRiskDisplayScore(r.residualRisk)}/100 <span style="color:#6b7280;font-size:0.85em;">(raw: ${r.residualRisk.toFixed(2)}/25)</span></p>
      ${r.treatment ? `<p><strong>Treatment Plan:</strong> ${esc(r.treatment)}</p>` : ''}
      ${r.estimatedCost ? `<p><strong>Estimated Cost:</strong> ${esc(r.estimatedCost)}</p>` : ''}
    </div>
  `}).join('')}
  ` : ''}

  <h2>Control Assessment Summary</h2>
  <table>
    <tr>
      <th>Control Category</th>
      <th>Avg Score</th>
      <th>Weak Controls (Score < 3)</th>
    </tr>
    ${['perimeter', 'access', 'detection', 'hardening', 'response'].map(cat => {
      const controls = Object.entries(d.controls[cat] || {});
      const weakControls = controls.filter(([k, c]) => c.score > 0 && c.score < 3);
      const avg = controls.length > 0 
        ? (controls.reduce((sum, [k, c]) => sum + (c.score || 0), 0) / controls.length).toFixed(1)
        : 'N/A';
      
      return `
        <tr>
          <td style="text-transform: capitalize;">${cat}</td>
          <td>${avg}/5</td>
          <td>${weakControls.length > 0 
            ? weakControls.map(([k, c]) => getControlLabel(k) + ` (${c.score})${c.notes ? ': ' + esc(c.notes) : ''}`).join('<br>')
            : 'None'
          }</td>
        </tr>
      `;
    }).join('')}
  </table>

  <h2>Key Control Gaps</h2>
  ${Object.entries(d.controls).map(([cat, ctrls]) => {
    const gaps = Object.entries(ctrls).filter(([k, c]) => c.score > 0 && c.score < 3);
    if (gaps.length === 0) return '';
    return `
      <div class="gap-${gaps.some(([k, c]) => c.score === 1) ? 'critical' : 'warning'}">
        <h3 style="text-transform: capitalize;">${cat} Layer</h3>
        <ul>
          ${gaps.map(([k, c]) => `
            <li>
              <strong>${getControlLabel(k)}:</strong> Score ${c.score}/5
              ${c.notes ? `<div class="note">Note: ${esc(c.notes)}</div>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }).join('')}

  <h2>Mitigation Recommendations</h2>
  <p>The following recommendations are prioritized by residual risk level and are intended to reduce the likelihood and/or impact of the threats identified in this assessment.</p>
  ${sortedRisks.map((risk, i) => {
    const applicableControls = THREAT_CONTROL_MAP[risk.threat]?.controls || [];
    const allCtrl = getAllControlsFlat(d.controls);
    const weakControls = applicableControls
      .map(ctrlKey => allCtrl.find(c => c.key === ctrlKey))
      .filter(c => c && c.score > 0 && c.score < 3)
      .sort((a, b) => a.score - b.score);
    const strongGaps = applicableControls
      .map(ctrlKey => allCtrl.find(c => c.key === ctrlKey))
      .filter(c => c && c.score === 0);
    const recMap = {
      fencing: "Upgrade to 8' chain-link with 3-strand barbed wire, repair gaps, add anti-climb measures",
      gates: "Install high-security locks, automated access control, vehicle barriers at entry points",
      lighting: "Add perimeter LED lighting with backup power, eliminate dark zones around critical assets",
      bollards: "Install crash-rated bollards (K4/K8) at vehicle approach points",
      signage: "Post clear no-trespassing signs with contact info at all entry points and along perimeter",
      locks: "Replace with high-security cylinders, implement a formal key control program",
      cardReaders: "Deploy card readers at all access points, integrate with centralized monitoring",
      visitorMgmt: "Implement sign-in system, require escorts for non-credentialed personnel, issue temporary badges",
      credentialAcct: "Deploy badge tracking system with prompt revocation procedures upon termination",
      cctv: "Install megapixel cameras with 30-day retention and active monitoring by SOC",
      intrusion: "Deploy perimeter sensors (fence-mounted, volumetric), integrate with SOC for real-time alerting",
      patrols: "Schedule regular patrols with documented rounds and mobile response capability",
      monitoring: "Establish 24/7 Security Operations Center with video verification and dispatch protocols",
      security: "Improve coordination with law enforcement, establish MOU, target reduced response time",
      communications: "Install redundant communications (radio + cellular), test quarterly",
      drone: "Deploy RF/radar drone detection system with alert and response protocols",
      enclosures: "Add ballistic-rated or hardened enclosures for critical equipment",
      redundancy: "Implement N+1 redundancy and geographic diversity for critical systems"
    };
    const recs = weakControls.slice(0, 4).map(c =>
      '<li><strong>' + getControlLabel(c.key) + '</strong> (currently ' + c.score + '/5): ' + (recMap[c.key] || 'Improve implementation and maintenance') + '</li>'
    ).join('');
    const unscored = strongGaps.slice(0, 2).map(c =>
      '<li><strong>' + getControlLabel(c.key) + '</strong> (not scored): Consider implementing this control for this threat</li>'
    ).join('');
    if (!recs && !unscored) return '';
    return '<div class="recommendation"><h3>#' + (i+1) + ' ' + risk.threat + ' <span style="font-size:0.8em;color:#6b7280;">(' + risk.riskLevel + ' — Risk Index: ' + getRiskDisplayScore(risk.residualRisk) + '/100)</span></h3><ul>' + recs + unscored + '</ul></div>';
  }).join('')}

  ${(() => {
    // Collect all photos: asset photos and control photos
    const assetPhotos = Object.entries(d.criticality.assetPhotos || {}).filter(([k, v]) => Array.isArray(v) && v.length > 0);
    const controlPhotos = Object.entries(d.controlPhotos || {}).filter(([k, v]) => Array.isArray(v) && v.length > 0);
    if (assetPhotos.length === 0 && controlPhotos.length === 0) return '';
    return '<h2>Photo Evidence</h2>' +
      '<p>The following photographs were captured during the assessment to document current conditions.</p>' +
      (assetPhotos.length > 0 ? '<h3>Asset Photos</h3>' + assetPhotos.map(([asset, photos]) =>
        '<div style="margin:15px 0;"><h4 style="color:#054163;">' + asset + ' (' + photos.length + ' photo' + (photos.length !== 1 ? 's' : '') + ')</h4>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">' +
        photos.map(p => p.data ? '<div style="text-align:center;"><img src="' + p.data + '" style="max-width:250px;max-height:200px;border:1px solid #d1d5db;border-radius:4px;" /><p style="font-size:0.75em;color:#6b7280;margin-top:4px;">' + p.name + '</p></div>' : '').join('') +
        '</div></div>'
      ).join('') : '') +
      (controlPhotos.length > 0 ? '<h3>Control Photos</h3>' + controlPhotos.map(([key, photos]) => {
        const parts = key.split('-');
        const controlKey = parts[parts.length - 1];
        return '<div style="margin:15px 0;"><h4 style="color:#054163;">' + (getControlLabel(controlKey) || key) + ' (' + photos.length + ' photo' + (photos.length !== 1 ? 's' : '') + ')</h4>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">' +
          photos.map(p => p.data ? '<div style="text-align:center;"><img src="' + p.data + '" style="max-width:250px;max-height:200px;border:1px solid #d1d5db;border-radius:4px;" /><p style="font-size:0.75em;color:#6b7280;margin-top:4px;">' + p.name + '</p></div>' : '').join('') +
          '</div></div>';
      }).join('') : '');
  })()}

  <hr style="margin: 40px 0;">
  <p style="text-align: center; color: #6b7280; font-size: 0.9em;">
    Assessment completed on ${esc(d.facility.date) || new Date().toISOString().split('T')[0]} by ${esc(d.facility.assessor) || 'Not specified'}${d.facility.assessorEmail ? ' (' + esc(d.facility.assessorEmail) + ')' : ''}
  </p>
</body>
</html>
    `;
    
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Security-Assessment-Report-${(d.facility.facilityId || "facility").replace(/\s/g, "-")}-${d.facility.date}.html`;
    a.click();
  };

  const catScores = ["perimeter","access","detection","hardening","response"].map((c) => {
    const score = avgScore(d.controls[c]);
    return score === "N/A" ? 0 : parseFloat(score);
  });
  const validScores = catScores.filter(s => s > 0);
  const overallCtrl = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : "N/A";

  // ── STEP 0: Facility Profile ──────────────────────────────────────────────
  const FacilityProfile = React.memo(() => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold c-text-navy c-bg-light px-4 py-2 rounded-lg inline-block border-l-4 c-border-red">Facility Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium c-text-navy mb-1">Assessment Date</label>
            <input type="date" defaultValue={d.facility.date} onBlur={(e) => setFac("date", e.target.value)} className="w-full p-2 border-2 c-border-gray rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium c-text-navy mb-1">Assessed By</label>
            <input type="text" defaultValue={d.facility.assessor} placeholder="Your name" onBlur={(e) => setFac("assessor", e.target.value)} className="w-full p-2 border-2 c-border-gray rounded" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Assessor Email</label>
          <input type="email" defaultValue={d.facility.assessorEmail} placeholder="email@example.com" onBlur={(e) => setFac("assessorEmail", e.target.value)} className="w-full p-2 border-2 c-border-gray rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Subvertical</label>
          <select value={d.facility.type} onChange={(e) => { setFac("type", e.target.value); }} className="w-full p-2 border-2 c-border-gray rounded">
            <option value="">Select subvertical...</option>
            {FACILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Risk Tolerance</label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="1"
              max="5"
              value={d.facility.riskTolerance || 3}
              onChange={(e) => setFac("riskTolerance", parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-bold c-text-teal w-16">
              {d.facility.riskTolerance || 3}/5
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>High Tolerance</span>
            <span>Balanced</span>
            <span>Very Low Tolerance</span>
          </div>
          <div className="mt-3 p-3 c-bg-light border-2 c-border-light rounded text-xs">
            {(d.facility.riskTolerance || 3) === 1 && (
              <div>
                <div className="font-semibold c-text-navy mb-1">1 — High Risk Tolerance (Risk-Accepting)</div>
                <div className="text-gray-600 space-y-1">
                  <div>• <strong>Operational posture:</strong> Reactive; security investments are limited and often site-by-site.</div>
                  <div>• <strong>Typical controls:</strong> Basic perimeter/locks, limited camera coverage, minimal monitoring, response is slow/variable.</div>
                </div>
              </div>
            )}
            {(d.facility.riskTolerance || 3) === 2 && (
              <div>
                <div className="font-semibold c-text-navy mb-1">2 — Moderately High Risk Tolerance</div>
                <div className="text-gray-600 space-y-1">
                  <div>• <strong>Operational posture:</strong> Targeted upgrades; accepts gaps if criticality is low.</div>
                  <div>• <strong>Typical controls:</strong> Some cameras/lighting, partial coverage, basic alarm points, monitoring may be limited-hours.</div>
                </div>
              </div>
            )}
            {(d.facility.riskTolerance || 3) === 3 && (
              <div>
                <div className="font-semibold c-text-navy mb-1">3 — Balanced / Risk-Managed (Most Common)</div>
                <div className="text-gray-600 space-y-1">
                  <div>• <strong>Operational posture:</strong> Risk-based standardization; prioritizes continuity and safety at key nodes.</div>
                  <div>• <strong>Typical controls:</strong> Good perimeter + lighting, meaningful camera coverage, alarms on critical areas, defined response model.</div>
                </div>
              </div>
            )}
            {(d.facility.riskTolerance || 3) === 4 && (
              <div>
                <div className="font-semibold c-text-navy mb-1">4 — Low Risk Tolerance (Risk-Averse)</div>
                <div className="text-gray-600 space-y-1">
                  <div>• <strong>Operational posture:</strong> Proactive hardening; prefers layered security and documented procedures.</div>
                  <div>• <strong>Typical controls:</strong> Strong deterrence and detection layers, better coverage/analytics, tighter access management, 24/7 monitoring common.</div>
                </div>
              </div>
            )}
            {(d.facility.riskTolerance || 3) === 5 && (
              <div>
                <div className="font-semibold c-text-navy mb-1">5 — Very Low Risk Tolerance (Highly Risk-Averse / Zero-Event Bias)</div>
                <div className="text-gray-600 space-y-1">
                  <div>• <strong>Operational posture:</strong> Formal security program maturity; standardization, governance, continuous improvement.</div>
                  <div>• <strong>Typical controls:</strong> Defense-in-depth (deter/delay/detect/respond), strong monitoring + response SLAs, robust access control, frequent testing/drills.</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Client Name</label>
          <input type="text" defaultValue={d.facility.clientName} placeholder="Organization or client name" onBlur={(e) => setFac("clientName", e.target.value)} className="w-full p-2 border-2 c-border-gray rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Facility Identifier</label>
          <input type="text" defaultValue={d.facility.facilityId} placeholder="e.g., SUB-042, PLANT-NORTH, WTP-3" onBlur={(e) => setFac("facilityId", e.target.value)} className="w-full p-2 border-2 c-border-gray rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Address</label>
          <input type="text" defaultValue={d.facility.address} placeholder="Street address" onBlur={(e) => setFac("address", e.target.value)} className="w-full p-2 border-2 c-border-gray rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">GPS Coordinates</label>
          <div className="flex gap-2">
            <input type="text" value={d.facility.coordinates || ""} onChange={(e) => setFac("coordinates", e.target.value)} placeholder="Lat, Long (e.g., 32.7767, -96.7970)" className="flex-1 p-2 border-2 c-border-gray rounded" />
            <button onClick={captureGPS} disabled={d.facility.gpsLoading}
              className="flex items-center gap-2 px-4 py-2 c-bg-teal  c-disabled-gray text-white rounded font-medium text-sm whitespace-nowrap">
              {d.facility.gpsLoading ? "Locating..." : "Use GPS"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Tap "Use GPS" on mobile to auto-capture your current location.</p>
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Law Enforcement Response Time (min)</label>
          <input 
            type="number" 
            min="0" 
            defaultValue={d.facility.responseTime} 
            placeholder="Estimated minutes"
            onBlur={(e) => {
              const val = e.target.value;
              setFac("responseTime", val);
              const responseTime = parseInt(val) || null;
              if (responseTime) {
                let score;
                if (responseTime <= 5) score = 5;
                else if (responseTime <= 10) score = 4;
                else if (responseTime <= 20) score = 3;
                else if (responseTime <= 30) score = 2;
                else score = 1;
                setCtrl("response", "security", "score", score);
              }
            }}
            className="w-full p-2 border-2 c-border-gray rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Location Attributes</label>
          <select value={d.facility.locationAttributes} onChange={(e) => setFac("locationAttributes", e.target.value)} className="w-full p-2 border-2 c-border-gray rounded">
            <option value="">Select...</option>
            {LOCATION_ATTRIBUTES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium c-text-navy mb-2">Adjacencies</label>
          <p className="text-xs text-gray-500 mb-2">Identify assets or facilities in proximity that may affect risk.</p>
          <textarea defaultValue={d.facility.adjacencyNotes} rows={3}
            placeholder="List applicable adjacencies and describe distances, access points, or relevant context..."
            onBlur={(e) => setFac("adjacencyNotes", e.target.value)}
            className="w-full p-2 border-2 c-border-gray rounded text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Nearby Risk Entities</label>
          <p className="text-xs text-gray-500 mb-2">Auto-detect adjacent facilities (government, schools, military, etc.) that affect threat likelihood. Uses your address or GPS coordinates — requires internet access.</p>
          <button
            onClick={lookupNearbyEntities}
            disabled={d.facility.entityLookupStatus === "loading"}
            className="flex items-center gap-2 px-4 py-2 c-bg-teal c-disabled-gray text-white rounded font-medium text-sm whitespace-nowrap"
            tabIndex={0}
          >
            {d.facility.entityLookupStatus === "loading" ? "Scanning nearby..." : "Find Nearby Entities"}
          </button>
          {d.facility.entityLookupStatus === "error" && <p className="text-xs text-red-600 mt-1">⚠️ Lookup failed. Verify your address is complete or check internet connection.</p>}
          {d.facility.entityLookupStatus === "none"  && <p className="text-xs text-gray-500 mt-1">No significant risk entities detected within 2,000 ft. Use the Adjacencies field to document known nearby facilities manually.</p>}
          {(d.facility.nearbyEntities||[]).length > 0 && (
            <div className="mt-3 border-2 c-border-light rounded p-3">
              <p className="text-xs font-semibold c-text-navy mb-2">Detected nearby — check all that are relevant to this assessment:</p>
              <div className="space-y-1">
                {(d.facility.nearbyEntities||[]).map(entity => (
                  <label key={entity.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input type="checkbox" checked={entity.confirmed} onChange={() => toggleNearbyEntity(entity.id)} className="w-4 h-4" />
                    <span className={entity.confirmed ? "c-text-navy font-medium" : "text-gray-500"}>
                      <span className="font-medium">{entity.name}</span>
                      {entity.distance ? <span className="text-xs text-gray-400"> · {Math.round(entity.distance * 3.28084)}ft</span> : ""}
                      <span className="text-xs text-gray-500"> — {entity.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium c-text-navy mb-1">Visibility from Public Road</label>
          <select value={d.facility.visibility} onChange={(e) => setFac("visibility", e.target.value)} className="w-full p-2 border-2 c-border-gray rounded">
            <option value="">Select...</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>
    );
  });

  // ── STEP 1: Asset Criticality ─────────────────────────────────────────────
  const AssetCriticality = () => {
    const sub = d.facility.type;
    const assets = sub ? (ASSETS_BY_SUBVERTICAL[sub] || []) : [];
    const presentAssets = assets.filter((a) => d.criticality.assetPresence[a] === true);
    const confirmedCount = assets.filter((a) => d.criticality.assetPresence[a] !== undefined).length;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold c-text-navy c-bg-light px-4 py-2 rounded-lg inline-block border-l-4 c-border-red">Asset Criticality Assessment</h2>
        {!sub ? (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-5 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-yellow-800">No Subvertical Selected</p>
            <p className="text-sm text-yellow-700 mt-1">Return to Facility Profile and select a Subvertical to load the relevant assets.</p>
          </div>
        ) : (
          <>
            {/* Header banner */}
            <div className="c-bg-light border-2 c-border-light rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold c-text-navy">{sub}</p>
                <p className="text-xs c-text-teal mt-0.5">Confirm which assets are present, then rate their criticality.</p>
              </div>
              <span className="text-xs c-bg-light c-text-navy px-2 py-1 rounded-full font-medium">
                {confirmedCount}/{assets.length} confirmed
              </span>
            </div>

            {/* Asset cards */}
            {assets.map((asset) => {
              const presence  = d.criticality.assetPresence[asset];
              const isPresent = presence === true;
              const isAbsent  = presence === false;
              const score     = d.criticality.assetScores[asset] || 3;
              const tier      = getCritTier(score);
              const isOpen    = open["a_" + asset];

              return (
                <div key={asset} className={
                  "border-2 rounded-lg overflow-hidden transition-all " +
                  (isAbsent  ? "border-gray-200 opacity-60" :
                   isPresent ? tier.bc : "border-gray-300")
                }>
                  {/* Header row: name + toggle buttons */}
                  <div className={
                    "px-4 py-3 flex items-center justify-between " +
                    (isAbsent ? "c-bg-light" : isPresent ? tier.bg : "bg-white border-l-4 c-border-teal")
                  }>
                    <h3 className={"font-semibold " + (isAbsent ? "text-gray-400" : "c-text-navy")}>
                      {asset}
                      {isPresent && ((d.criticality.assetPhotos || {})[asset] || []).length > 0 && (
                        <span className="ml-2 inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{((d.criticality.assetPhotos || {})[asset]).length} photo{((d.criticality.assetPhotos || {})[asset]).length !== 1 ? "s" : ""}</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      {isPresent && (
                        <>
                          {/* Gallery picker — works on all platforms */}
                          <input
                            type="file"
                            id={`asset-photo-${asset}`}
                            accept="image/*"
                            multiple
                            onChange={(e) => { handleAssetPhotoUpload(asset, e.target.files); e.target.value = ""; }}
                            className="hidden"
                          />
                          {/* Camera capture — ensures Android can take photos directly */}
                          <input
                            type="file"
                            id={`asset-camera-${asset}`}
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => { handleAssetPhotoUpload(asset, e.target.files); e.target.value = ""; }}
                            className="hidden"
                          />
                          <button
                            onClick={() => document.getElementById(`asset-camera-${asset}`).click()}
                            className="flex items-center gap-1 px-2 py-1 rounded border border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors text-gray-500 text-xs font-medium"
                            title="Take photo with camera"
                            tabIndex={0}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Take Photo
                          </button>
                          <button
                            onClick={() => document.getElementById(`asset-photo-${asset}`).click()}
                            className="flex items-center gap-1 px-2 py-1 rounded border border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors text-gray-500 text-xs font-medium"
                            title="Choose from gallery"
                            tabIndex={0}
                          >
                            <span>+ Gallery</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setAssetPresence(asset, isPresent ? undefined : true);
                          if (!isPresent) toggle("a_" + asset);
                        }}
                        className={
                          "px-3 py-1 rounded-full text-xs font-semibold border transition-colors " +
                          (isPresent
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-500 border-gray-300 hover:border-green-400 hover:text-green-600")
                        }
                        tabIndex={0}
                      >
                        ✓ Present
                      </button>
                      <button
                        onClick={() => setAssetPresence(asset, isAbsent ? undefined : false)}
                        className={
                          "px-3 py-1 rounded-full text-xs font-semibold border transition-colors " +
                          (isAbsent
                            ? "bg-gray-400 text-white border-gray-400"
                            : "bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-600")
                        }
                        tabIndex={0}
                      >
                        ✕ Not Present
                      </button>
                      {isPresent && (
                        <button onClick={() => toggle("a_" + asset)} className="ml-1 text-gray-400 hover:text-gray-600" tabIndex={0}>
                          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Criticality badge — shown when present */}
                  {isPresent && (
                    <div className={"px-4 pb-2 pt-1 flex items-center gap-3 " + tier.bg}>
                      <span className={"text-xs font-semibold px-2 py-0.5 rounded-full border " + tier.tc + " " + tier.bg + " " + tier.bc}>
                        {tier.tier}
                      </span>
                      <span className="text-sm text-gray-500">Rating: <span className={"font-bold " + tier.tc}>{score}/5</span></span>
                    </div>
                  )}

                  {/* Single criticality slider — shown when present and expanded */}
                  {isPresent && isOpen && (
                    <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-100">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-medium c-text-navy">Criticality Rating</p>
                        <span className={"text-2xl font-bold " + tier.tc}>
                          {score}<span className="text-sm text-gray-400 font-normal"> /5</span>
                        </span>
                      </div>
                      <input
                        type="range" min="1" max="5" step="1" value={score}
                        onChange={(e) => setAsset(asset, e.target.value)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span className="w-16 text-left">Minor</span>
                        <span className="text-center">Low</span>
                        <span className="text-center">Moderate</span>
                        <span className="text-center">High</span>
                        <span className="w-20 text-right">Severe</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-600 italic">
                        {score === 1 && "Limited operational impact if degraded or lost; localized inconvenience; easy workarounds."}
                        {score === 2 && "Noticeable impact to operations or service quality, but contained; recovery is straightforward."}
                        {score === 3 && "Material operational impact; could affect production/distribution capacity or reliability; recovery requires coordinated effort."}
                        {score === 4 && "Significant service interruption, safety exposure, or major operational disruption; difficult recovery; high visibility."}
                        {score === 5 && "Sustained outage or major safety/environmental consequence likely; cascading impacts beyond the site; strategic/regional significance."}
                      </div>
                      {/* Photo gallery for this asset */}
                      {((d.criticality.assetPhotos || {})[asset] || []).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium c-text-navy mb-2">Attached Photos</p>
                          <div className="flex flex-wrap gap-2">
                            {((d.criticality.assetPhotos || {})[asset] || []).map((photo, idx) => (
                              <div key={idx} className="relative group">
                                <img src={photo.data} alt={photo.name} className="w-16 h-16 object-cover rounded border border-gray-200" />
                                <button
                                  onClick={() => removeAssetPhoto(asset, idx)}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                  title="Remove photo"
                                >×</button>
                                <p className="text-center text-gray-400 mt-0.5" style={{fontSize: "8px"}}>{photo.name.length > 10 ? photo.name.slice(0, 10) + "…" : photo.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Summary table — present assets only */}
            {presentAssets.length > 0 && (
              <div className="border-2 c-border-gray rounded-lg overflow-hidden">
                <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Asset Criticality Summary</h3>
                  <span className="text-xs text-gray-300">{presentAssets.length} asset{presentAssets.length !== 1 ? "s" : ""} present</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="c-bg-light">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium c-text-navy">Asset</th>
                      <th className="text-center px-4 py-2 font-medium c-text-navy">Score</th>
                      <th className="text-center px-4 py-2 font-medium c-text-navy">Criticality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presentAssets.map((asset, i) => {
                      const sc   = d.criticality.assetScores[asset] || 3;
                      const tier = getCritTier(sc);
                      return (
                        <tr key={asset} className={i % 2 === 0 ? "bg-white border-l-4 c-border-teal" : "c-bg-light"}>
                          <td className="px-4 py-2 c-text-navy">{asset}</td>
                          <td className={"px-4 py-2 text-center font-bold " + tier.tc}>{sc}/5</td>
                          <td className="px-4 py-2 text-center">
                            <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + tier.bg + " " + tier.tc}>{tier.tier}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ── STEP 2: Control Assessment ────────────────────────────────────────────
  const ControlAssessment = () => {
    const overallRating = getCtrlRating(overallCtrl);
    
    const cats = [
      { id: "perimeter", name: "Perimeter Security", Icon: Shield,
        ctrls: [
          { k: "fencing",  l: "Fencing",            d: "Type, height, condition, anti-climb features, coverage of full perimeter" },
          { k: "gates",    l: "Gates",               d: "Number of entry points, locking mechanism, automated vs. manual, condition" },
          { k: "signage",  l: "Signage",             d: "No Trespassing / warning signs posted at entry points and along perimeter with contact info" },
          { k: "lighting", l: "Lighting",            d: "Perimeter and interior coverage, dark spots, backup power, operational status" },
          { k: "bollards", l: "Bollards / Barriers", d: "Crash-rated (K-rating) vehicle barriers at approach points, condition" },
        ],
      },
      { id: "access", name: "Access Control", Icon: Lock,
        ctrls: [
          { k: "locks",          l: "Physical Locks",               d: "Lock type (padlock, cylinder, high-security), key control program, coverage of cabinets, valve boxes, enclosures" },
          { k: "cardReaders",    l: "Electronic Access Control",    d: "Card readers or biometrics at entry points, access logs reviewed, integration with monitoring" },
          { k: "visitorMgmt",    l: "Visitor Management",           d: "Sign-in/sign-out process, escort requirements for non-credentialed personnel, temporary badges" },
          { k: "credentialAcct", l: "Identity & Access Management", d: "Credential issuance and tracking, prompt revocation on termination, audit of active credentials" },
        ],
      },
      { id: "detection", name: "Surveillance & Detection", Icon: Eye,
        ctrls: [
          { k: "cctv",       l: "Video Surveillance",              d: "Camera coverage (% of perimeter/critical areas), retention period, actively monitored vs. forensic only" },
          { k: "intrusion",  l: "Intrusion Detection System",        d: "Perimeter sensors (fence-mounted, buried, volumetric), alarm integration with SOC, false alarm rate" },
          { k: "patrols",    l: "Security Officer Presence",         d: "On-site or roving officers, patrol frequency and schedule, documented rounds, response capability" },
          { k: "drone",      l: "Drone Detection",                   d: "RF detection, radar, or acoustic sensors for UAS identification and tracking, alert protocols" },
        ],
      },
      { id: "hardening", name: "Asset Hardening", Icon: Building,
        ctrls: [
          { k: "enclosures", l: "Hardened Enclosures",  d: "Ballistic or blast-rated protection, reinforced structures, weather shielding for critical equipment" },
          { k: "redundancy", l: "Redundancy",           d: "N+1 backup systems, geographic diversity, failover capability for critical operations" },
        ],
      },
      { id: "response", name: "Response Capability", Icon: AlertTriangle,
        ctrls: [
          { k: "monitoring",     l: "Security Operations Center (SOC)",    d: "Monitoring hours (24/7 vs. business hours), alarm receipt and assessment, video verification, dispatch coordination" },
          { k: "security",       l: "Security & Law Enforcement Response", d: "On-site security presence, LE coordination and MOU, verified response time, dispatch protocols" },
          { k: "communications", l: "Communication Systems",                d: "Redundant comms (radio + cellular), regular testing, backup power for comms equipment" },
        ],
      },
    ];
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold c-text-navy c-bg-light px-4 py-2 rounded-lg inline-block border-l-4 c-border-red">Control Assessment</h2>
        <div className={"border-2 c-border-teal shadow-md rounded-lg p-4 " + overallRating.bg}>
          <div className="flex justify-between items-center text-white">
            <div>
              <h3 className="font-semibold c-text-navy">Overall Control Effectiveness</h3>
              <p className="text-sm text-gray-600">Average across all categories</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold c-text-navy">{overallCtrl}</div>
              <div className={"inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 " + overallRating.bg + " " + overallRating.tc}>{overallRating.label}</div>
            </div>
          </div>
        </div>
        {cats.map(({ id, name, Icon, ctrls }) => {
          const catAvg = avgScore(d.controls[id]);
          const rating = getCtrlRating(catAvg);
          const isOpen = open[id];
          return (
            <div key={id} className="border-2 c-border-gray rounded-lg overflow-hidden">
              <div className="c-bg-light p-4 cursor-pointer flex justify-between items-center hover:c-bg-light" onClick={() => toggle(id)}>
                <div className="flex items-center space-x-3">
                  <Icon className="w-6 h-6 c-text-teal" />
                  <div>
                    <h3 className="font-semibold c-text-navy">{name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600">Score: {catAvg}</span>
                      <span className={"text-xs px-2 py-1 rounded " + rating.bg + " " + rating.tc}>{rating.label}</span>
                    </div>
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              {isOpen && (
                <div className="p-4 space-y-4 bg-white border-l-4 c-border-teal">
                  {ctrls.map(({ k, l, d: desc }) => {
                    const ctrl = d.controls[id][k];
                    const responseTime = parseInt(d.facility.responseTime) || null;
                    const isResponseControl = k === "security";
                    
                    return (
                      <div key={k} className="border-2 c-border-light rounded p-3 space-y-3">
                        <div>
                          <h4 className="font-medium c-text-navy">{l}</h4>
                          <p className="text-xs text-gray-600">{desc}</p>
                          {isResponseControl && (
                            <div className="mt-2 p-2 c-bg-light border-2 c-border-light rounded text-xs">
                              <p className="font-medium c-text-navy mb-1">
                                Response Time: {responseTime ? `${responseTime} min` : "Not specified"}
                              </p>
                              <p className="c-text-teal">
                                {!responseTime && "⚠️ Enter response time in Facility Profile to auto-calculate score"}
                                {responseTime && responseTime <= 5 && "✓ Excellent — Score auto-set to 5 (Robust). Aligns with top-quartile urban response."}
                                {responseTime && responseTime > 5 && responseTime <= 10 && "✓ Good — Score auto-set to 4 (Strong). Consistent with national urban average."}
                                {responseTime && responseTime > 10 && responseTime <= 20 && "ⓘ Adequate — Score auto-set to 3. Typical suburban response window."}
                                {responseTime && responseTime > 20 && responseTime <= 30 && "⚠️ Weak — Score auto-set to 2. Extended response; most attacks complete before arrival."}
                                {responseTime && responseTime > 30 && "⚠️ Ineffective — Score auto-set to 1. Response time exceeds virtually all attack durations."}
                              </p>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium c-text-navy">Control Effectiveness {isResponseControl && <span className="text-xs font-normal text-gray-500">(auto-calculated)</span>}</label>
                            <span className="text-xl font-bold c-text-teal">
                              {ctrl.score === 0 ? "N/A" : ctrl.score}
                              <span className="text-sm text-gray-400 font-normal"> {ctrl.score === 0 ? "" : "/5"}</span>
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="5" 
                            step="1" 
                            value={ctrl.score} 
                            onChange={(e) => !isResponseControl && setCtrl(id, k, "score", e.target.value)} 
                            disabled={isResponseControl}
                            className={"w-full " + (isResponseControl ? "opacity-50 cursor-not-allowed" : "")}
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span className="w-16 text-left">N/A</span>
                            <span className="w-20 text-left">Ineffective</span>
                            <span className="text-center">Weak</span>
                            <span className="text-center">Adequate</span>
                            <span className="text-center">Strong</span>
                            <span className="w-16 text-right">Robust</span>
                          </div>
                          <div className="mt-2 text-xs text-gray-600 italic">
                            {ctrl.score === 0 && "Control not applicable to this asset type (e.g., control room doesn't have perimeter fencing)."}
                            {ctrl.score === 1 && "Control is absent, routinely bypassed, nonfunctional, or purely \"on paper.\" No meaningful delay or detection capability; incidents discovered hours or days later, typically during routine site visits. Coverage is spotty with major gaps; response is unreliable or undefined."}
                            {ctrl.score === 2 && "Control exists but is inconsistent (limited coverage/hours), outdated, or poorly maintained. May provide 1-3 minutes of delay or require extended time for SOC assessment. Procedures are informal; alarms/events often not acted on or response is slow/unpredictable."}
                            {ctrl.score === 3 && "Control is generally present and working; known gaps exist but are manageable. Provides 3-10 minutes of delay and/or detection within 2-5 minutes; SOC can verify and dispatch during business hours. Basic governance and maintenance are in place; response works but may be business-hours or limited."}
                            {ctrl.score === 4 && "Control is well-designed and consistently applied with few meaningful gaps. Provides 10-20 minutes of delay and/or real-time detection with SOC verification and dispatch within minutes. Good maintenance discipline; clear ownership; effective monitoring/dispatch; response is reliable."}
                            {ctrl.score === 5 && "Control is layered, validated, and resilient (redundancy, uptime monitoring, testing). Provides 20+ minutes of delay and/or immediate detection (under 1 minute) with 24/7 SOC response and verified rapid dispatch. High consistency across shifts/sites; rapid verified response; continuous improvement through metrics/reviews."}
                          </div>
                          <div className="mt-3">
                            <label className="block text-xs font-medium c-text-navy mb-1">
                              Notes / Justification {ctrl.score === 0 && <span className="text-gray-500">(Why is this N/A?)</span>}
                              {ctrl.score > 0 && ctrl.score <= 2 && <span className="text-gray-500">(Why rated low?)</span>}
                            </label>
                            <textarea
                              key={`${id}-${k}-notes`}
                              defaultValue={ctrl.notes || ""}
                              onBlur={(e) => setCtrl(id, k, "notes", e.target.value)}
                              placeholder={
                                ctrl.score === 0 ? "e.g., Remote facility has no perimeter" :
                                k === "fencing" ? "e.g., Chain-link only, no barbed wire, gaps at rear" :
                                k === "lighting" ? "e.g., Only front gate illuminated, dark spots along east side" :
                                k === "cctv" ? "e.g., Cameras present but not monitored, no recording" :
                                k === "intrusion" ? "e.g., Sensors installed but alarms not connected to SOC" :
                                k === "monitoring" ? "e.g., Business hours only, no 24/7 coverage" :
                                k === "locks" ? "e.g., Standard padlocks, no high-security cylinders" :
                                k === "cardReaders" ? "e.g., Card readers at main gate only, side doors mechanical" :
                                k === "credentialAcct" ? "e.g., No badge tracking system, contractors keep credentials" :
                                "e.g., Specific gaps or implementation details"
                              }
                              className="w-full p-2 border-2 c-border-gray rounded text-xs"
                              rows={2}
                            />
                          </div>
                          <div className="mt-3">
                            <label className="block text-xs font-medium c-text-navy mb-2">
                              Optional: Attach Photos
                              {((d.controlPhotos || {})[`${id}-${k}`] || []).length > 0 && (
                                <span className="ml-2 inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{((d.controlPhotos || {})[`${id}-${k}`]).length} photo{((d.controlPhotos || {})[`${id}-${k}`]).length !== 1 ? "s" : ""}</span>
                              )}
                            </label>
                            <div className="flex items-center gap-2">
                              {/* Gallery picker */}
                              <input
                                type="file"
                                id={`control-photo-${id}-${k}`}
                                accept="image/*"
                                multiple
                                onChange={(e) => { handleControlPhotoUpload(`${id}-${k}`, e.target.files); e.target.value = ""; }}
                                className="hidden"
                              />
                              {/* Camera capture for Android */}
                              <input
                                type="file"
                                id={`control-camera-${id}-${k}`}
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => { handleControlPhotoUpload(`${id}-${k}`, e.target.files); e.target.value = ""; }}
                                className="hidden"
                              />
                              <button
                                onClick={() => document.getElementById(`control-camera-${id}-${k}`).click()}
                                className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors text-gray-600 text-xs font-medium"
                                title="Take photo with camera"
                                tabIndex={0}
                              >
                                <Camera className="w-4 h-4" />
                                Take Photo
                              </button>
                              <button
                                onClick={() => document.getElementById(`control-photo-${id}-${k}`).click()}
                                className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors text-gray-600 text-xs font-medium"
                                title="Choose from gallery"
                                tabIndex={0}
                              >
                                + Gallery
                              </button>
                            </div>
                            {/* Photo thumbnails */}
                            {((d.controlPhotos || {})[`${id}-${k}`] || []).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {((d.controlPhotos || {})[`${id}-${k}`] || []).map((photo, idx) => (
                                  <div key={idx} className="relative group">
                                    <img src={photo.data} alt={photo.name} className="w-14 h-14 object-cover rounded border border-gray-200" />
                                    <button
                                      onClick={() => removeControlPhoto(`${id}-${k}`, idx)}
                                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                      title="Remove photo"
                                    >×</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── STEP 3: Threat Identification ─────────────────────────────────────────
  const ThreatIdentification = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold c-text-navy c-bg-light px-4 py-2 rounded-lg inline-block border-l-4 c-border-red">Threat Identification</h2>
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
        <p className="text-sm c-text-navy">Select all threats that are <strong>credible and relevant</strong> for this facility.</p>
      </div>
      {THREAT_CATEGORIES.map(({ category, threats }) => {
        const selectedCount = d.threats.filter((t) => threats.find(th => th.name === t.name)).length;
        const isOpen = open[category];
        return (
          <div key={category} className="border-2 c-border-gray rounded-lg overflow-hidden">
            <div className="c-bg-light p-4 cursor-pointer flex justify-between items-center hover:c-bg-light" onClick={() => toggle(category)}>
              <h3 className="font-semibold c-text-navy">{category}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{selectedCount} selected</span>
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
            {isOpen && (
              <div className="p-4 space-y-3 bg-white border-l-4 c-border-teal">
                {threats.map((threat) => {
                  const found = d.threats.find((t) => t.name === threat.name);
                  return (
                    <div key={threat.name} className="border-2 c-border-light rounded p-3">
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input type="checkbox" checked={!!found} onChange={() => toggleThreat(threat.name)} className="w-4 h-4 mt-0.5" />
                        <div>
                          <span className="font-medium c-text-navy">{threat.name}</span>
                          <p className="text-xs text-gray-600 mt-1">{threat.description}</p>
                        </div>
                      </label>
                      {found && (
                        <div className="mt-3 ml-6 space-y-4">
                          {/* Evidence section */}
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Evidence / Indicators</p>
                            <div className="space-y-1">
                              {["Prior incidents", "Regional trend / High local crime"].map((ev) => (
                                <label key={ev} className="flex items-center space-x-2 text-sm">
                                  <input type="checkbox" className="w-3 h-3" checked={found.evidence.includes(ev)}
                                    onChange={(e) => {
                                      const newEv = e.target.checked ? [...found.evidence, ev] : found.evidence.filter((x) => x !== ev);
                                      setEvidence(threat.name, newEv);
                                    }}
                                  />
                                  <span className="c-text-navy">{ev}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Likelihood slider */}
                          <div className="border-t border-gray-100 pt-3">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium c-text-navy">Threat Likelihood</p>
                              <span className="text-xl font-bold c-text-teal">
                                {found.likelihood || 3}<span className="text-sm text-gray-400 font-normal"> /5</span>
                              </span>
                            </div>
                            <input
                              type="range" min="1" max="5" step="1"
                              value={found.likelihood || 3}
                              onChange={(e) => setThreatLikelihood(threat.name, e.target.value)}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span className="text-left w-16">Rare</span>
                              <span className="text-center">Unlikely</span>
                              <span className="text-center">Possible</span>
                              <span className="text-center">Likely</span>
                              <span className="text-right w-20">Almost Certain</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-600 italic">
                              {found.likelihood === 1 && "Not expected; would require unusual conditions or a highly atypical actor/event."}
                              {found.likelihood === 2 && "Could happen, but not common; limited exposure, access, or motivation."}
                              {(!found.likelihood || found.likelihood === 3) && "Credible and plausible; has occurred in the industry or region with some regularity."}
                              {found.likelihood === 4 && "Expected to occur; frequent exposure, clear opportunity, or known active threat pattern."}
                              {found.likelihood === 5 && "Persistent or imminent; repeated incidents, sustained targeting, or unavoidable conditions."}
                            </div>
                            {/* Context flags from location / visibility / nearby entities */}
                            {(() => {
                              const flags = getContextualRiskFlags(threat.name);
                              if (!flags.length) return null;
                              return (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {flags.map((f,i) => (
                                    <span key={i} title={f.note} className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border " + (f.dir==="up" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200")}>
                                      {f.dir==="up" ? "↑" : "↓"} {f.label}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}

                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {d.threats.length > 0 && (
        <div className="c-bg-light border-2 c-border-light rounded-lg p-4">
          <h4 className="font-semibold c-text-navy mb-2">Selected Threats ({d.threats.length})</h4>
          <ul className="text-sm space-y-1">
            {d.threats.map((t) => (
              <li key={t.name} className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>{t.name}</span>
                {t.evidence.length > 0 && <span className="text-xs text-gray-500">({t.evidence.join(", ")})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // ── STEP 4: Risk Analysis ─────────────────────────────────────────────────
  const RiskAnalysis = () => {
    const presentAssets = Object.entries(d.criticality.assetPresence)
      .filter(([_, present]) => present === true)
      .map(([assetName]) => ({ name: assetName, criticality: d.criticality.assetScores[assetName] || 3 }));

    const allControlsFlat = getAllControlsFlat(d.controls);

    // Build default risk entry for a threat (used by useEffect and render)
    const buildDefaultRisk = (threat) => {
      const mapping = THREAT_CONTROL_MAP[threat.name];
      const autoControls = mapping?.controls || [];
      const availableControls = autoControls.filter(ctrlKey => {
        const ctrl = allControlsFlat.find(c => c.key === ctrlKey);
        return ctrl && ctrl.score > 0;
      });
      const subvertical = d.facility.type;
      const relevantAssetNames = THREAT_ASSET_MAP[subvertical]?.[threat.name] || [];
      const relevantAssets = presentAssets.filter(a => relevantAssetNames.includes(a.name));
      return { threat: threat.name, likelihood: threat.likelihood || 3, affectedAssets: relevantAssets, selectedControls: availableControls, treatment: "", estimatedCost: "", priority: "", owner: "", targetDate: "" };
    };

    // Get or create risk entry for a threat (render-time read only)
    const getRiskForThreat = (threat) => {
      return d.risks.find(r => r.threat === threat.name) || buildDefaultRisk(threat);
    };

    const toggleAsset = (threatName, assetName) => {
      setD(p => ({ ...p, risks: p.risks.map(r => {
        if (r.threat !== threatName) return r;
        const assets = r.affectedAssets || [];
        const exists = assets.some(a => a.name === assetName);
        return { ...r, affectedAssets: exists ? assets.filter(a => a.name !== assetName) : [...assets, presentAssets.find(a => a.name === assetName)] };
      }) }));
    };

    const toggleControl = (threatName, controlKey) => {
      setD(p => ({ ...p, risks: p.risks.map(r => {
        if (r.threat !== threatName) return r;
        const controls = r.selectedControls || [];
        return { ...r, selectedControls: controls.includes(controlKey) ? controls.filter(k => k !== controlKey) : [...controls, controlKey] };
      }) }));
    };

    // Controls info for display
    const controlsInfo = allControlsFlat.map(c => ({ key: c.key, score: c.score }));

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold c-text-navy c-bg-light px-4 py-2 rounded-lg inline-block border-l-4 c-border-red">Residual Risk</h2>
        {d.threats.length === 0 ? (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
            <p className="text-sm c-text-navy">No threats identified. Go back to Threat Identification and select relevant threats.</p>
          </div>
        ) : presentAssets.length === 0 ? (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
            <p className="text-sm c-text-navy">No assets marked as present. Go back to Asset Criticality and confirm which assets exist at this facility.</p>
          </div>
        ) : (
          <>
            {d.threats.map(threat => {
              const risk = getRiskForThreat(threat);
              const maxCrit = risk.affectedAssets.length > 0
                ? Math.max(...risk.affectedAssets.map(a => a.criticality))
                : 0;
              const controlEff = risk.selectedControls.length > 0
                ? calculateControlEffectiveness(threat.name, risk.selectedControls, d.controls, d.facility.responseTime)
                : 1;
              const inherentRisk = maxCrit * threat.likelihood;
              const residualRisk = inherentRisk > 0 ? inherentRisk / controlEff : 0;
              const riskLevel = getRiskLevel(residualRisk);
              
              const responseTime = parseInt(d.facility.responseTime) || 999;
              const attackDuration = THREAT_CONTROL_MAP[threat.name]?.duration;
              const allCtrls = getAllControlsFlat(d.controls);
              const socScore = allCtrls.find(c => c.key === "monitoring")?.score || 0;
              const commsScore = allCtrls.find(c => c.key === "communications")?.score || 0;

              const warnings = [];
              if (socScore > 0 && socScore <= 2) warnings.push("⚠️ SOC capability weak - detection limited");
              if (commsScore > 0 && commsScore <= 2) warnings.push("⚠️ Communications weak - alerts may fail");
              if (attackDuration && responseTime > attackDuration * 2) {
                warnings.push(`⚠️ Response time (${responseTime} min) far exceeds attack duration (${attackDuration} min)`);
              } else if (attackDuration && responseTime > attackDuration) {
                warnings.push(`ⓘ Response time (${responseTime} min) exceeds attack duration (${attackDuration} min)`);
              }

              return (
                <div key={threat.name} className={"border-2 rounded-lg p-4 " + riskLevel.bc}>

                  {/* Site context flags */}
                  {(() => {
                    const flags = getContextualRiskFlags(threat.name);
                    if (!flags.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {flags.map((f,i) => (
                          <span key={i} title={f.note} className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border " + (f.dir==="up" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200")}>
                            {f.dir==="up" ? "↑" : "↓"} {f.label}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold c-text-navy">{threat.name}</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Likelihood: {threat.likelihood} | Evidence: {threat.evidence.join(", ") || "None"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={"px-3 py-1 rounded-full font-semibold text-sm " + riskLevel.bg + " " + riskLevel.tc}>{riskLevel.level}</div>
                      <div className="text-xs text-gray-600">Risk Index: {getRiskDisplayScore(residualRisk)}/100</div>
                    </div>
                  </div>

                  {/* Affected Assets */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium c-text-navy mb-2">Assets at Risk:</label>
                    <div className="flex flex-wrap gap-2">
                      {presentAssets.map(asset => {
                        const isSelected = risk.affectedAssets.some(a => a.name === asset.name);
                        const tier = getCritTier(asset.criticality);
                        return (
                          <button
                            key={asset.name}
                            onClick={() => toggleAsset(threat.name, asset.name)}
                            className={
                              "px-2 py-1 rounded text-xs border transition-colors " +
                              (isSelected
                                ? "c-bg-light c-border-teal c-text-navy"
                                : "c-bg-light border-gray-300 text-gray-600 hover:border-gray-300")
                            }
                          >
                            {asset.name} ({asset.criticality} - {tier.tier})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Applicable Controls */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium c-text-navy mb-2">Applicable Controls (auto-selected, adjust as needed):</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {controlsInfo.map(ctrl => {
                        const isSelected = risk.selectedControls.includes(ctrl.key);
                        const isLowScore = ctrl.score <= 1;
                        const isResponseControl = ctrl.key === "security";
                        const isNA = ctrl.score === 0;
                        return (
                          <label key={ctrl.key} className={"flex items-center space-x-2 p-1.5 rounded border " + (isLowScore || isResponseControl || isNA ? "opacity-50" : "")}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => !isResponseControl && !isNA && toggleControl(threat.name, ctrl.key)}
                              disabled={isResponseControl || isNA}
                              className="w-3.5 h-3.5"
                            />
                            <span className="flex-1">
                              {getControlLabel(ctrl.key)} ({isNA ? "N/A" : ctrl.score})
                              {isResponseControl && !isNA && <span className="text-gray-500 ml-1">(auto-calculated from response time)</span>}
                              {isNA && <span className="text-gray-500 ml-1">(not applicable)</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Risk Calculation */}
                  <div className="c-bg-light rounded p-3 mb-3">
                    <div className="grid grid-cols-3 gap-3 text-sm mb-2">
                      <div>
                        <span className="text-gray-600">Max Criticality:</span>
                        <span className="font-bold ml-1">{maxCrit || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Likelihood:</span>
                        <span className="font-bold ml-1">{threat.likelihood}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Control Effectiveness:</span>
                        <span className="font-bold ml-1">{controlEff.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-center pt-2 border-t">
                      <span className="text-sm text-gray-600">Residual Risk: </span>
                      <span className={"text-lg font-bold " + riskLevel.tc}>{riskLevel.level} — {getRiskDisplayScore(residualRisk)}/100</span>
                      <span className="text-xs text-gray-500 ml-2">(raw: {residualRisk.toFixed(2)}/25)</span>
                    </div>
                  </div>

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <div className="bg-yellow-100 border-2 border-yellow-400 rounded p-2 mb-3">
                      {warnings.map((w, i) => (
                        <p key={i} className="text-xs text-yellow-800">{w}</p>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </>
        )}
      </div>
    );
  };

  // ── STEP 5: Summary ───────────────────────────────────────────────────────
  const Summary = () => {
    const ctrlRating = getCtrlRating(overallCtrl);

    // Risk tolerance threshold mapping
    const toleranceThresholds = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 };
    const riskToleranceValue = d.facility.riskTolerance || 3;
    const toleranceThreshold = toleranceThresholds[riskToleranceValue];

    // Calculate actual residual risk scores using shared utility
    const risksWithScores = d.risks.map(risk => {
      const threat = d.threats.find(t => t.name === risk.threat);
      if (!threat || !risk.affectedAssets || risk.affectedAssets.length === 0) return null;

      const maxCrit = Math.max(...risk.affectedAssets.map(a => a.criticality));
      const controlEff = risk.selectedControls.length > 0
        ? calculateControlEffectiveness(threat.name, risk.selectedControls, d.controls, d.facility.responseTime)
        : 1;
      const inherentRisk = maxCrit * threat.likelihood;
      const residualRisk = inherentRisk > 0 ? inherentRisk / controlEff : 0;
      const exceedsTolerance = residualRisk >= toleranceThreshold;

      return { ...risk, residualRisk, maxCrit, likelihood: threat.likelihood, exceedsTolerance };
    }).filter(Boolean);
    
    const sortedRisks = [...risksWithScores].sort((a, b) => b.residualRisk - a.residualRisk);
    const totalCost = sortedRisks.reduce((s, r) => s + (parseFloat((r.estimatedCost || "").replace(/[$,]/g, "")) || 0), 0);
    
    // Count risks by level using actual residual risk scores
    const levels = {
      e: sortedRisks.filter((r) => r.residualRisk >= 10).length,
      h: sortedRisks.filter((r) => r.residualRisk >= 7 && r.residualRisk < 10).length,
      m: sortedRisks.filter((r) => r.residualRisk >= 4 && r.residualRisk < 7).length,
      l: sortedRisks.filter((r) => r.residualRisk < 4).length,
    };
    
    const highPri = sortedRisks.filter((r) => r.residualRisk >= 7); // HIGH or EXTREME
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold c-text-navy c-bg-light px-4 py-2 rounded-lg inline-block border-l-4 c-border-red">Assessment Summary & Report</h2>
        <div className="border-2 c-border-teal rounded-lg p-6 bg-white shadow-md">
          <h3 className="text-xl font-bold c-text-navy mb-4 border-b-2 c-border-red pb-2">Executive Summary</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="border-l-4 c-border-teal pl-4">
              <h4 className="font-semibold c-text-navy mb-2">Facility Information</h4>
              <div className="space-y-1 text-sm">
                {[
                  ["Client", d.facility.clientName],
                  ["Facility ID", d.facility.facilityId],
                  ["Subvertical", d.facility.type],
                  ["Date", d.facility.date],
                  ["Assessed By", d.facility.assessor],
                  d.facility.locationAttributes ? ["Location", d.facility.locationAttributes] : null,
                  d.facility.adjacencyNotes ? ["Adjacencies", d.facility.adjacencyNotes] : null,
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k}><span className="font-medium">{k}:</span> {v || "Not specified"}</div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold c-text-navy mb-2">Risk Profile</h4>
              <div className="space-y-2">
                <div className={"p-3 rounded " + ctrlRating.bg}>
                  <div className="text-xs text-gray-600">Control Effectiveness</div>
                  <div className={"text-lg font-bold " + ctrlRating.tc}>{overallCtrl} — {ctrlRating.label}</div>
                </div>
                <div className="p-3 rounded c-bg-light border-2 c-border-light">
                  <div className="text-xs text-gray-600">Total Risks Identified</div>
                  <div className="text-lg font-bold c-text-navy">{sortedRisks.length}</div>
                </div>
                <div className={"p-3 rounded border-2 " + (sortedRisks.filter(r => r.exceedsTolerance).length > 0 ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300")}>
                  <div className="text-xs text-gray-600">Exceeds Risk Tolerance ({riskToleranceValue}/5)</div>
                  <div className={"text-lg font-bold " + (sortedRisks.filter(r => r.exceedsTolerance).length > 0 ? "text-red-600" : "text-green-600")}>{sortedRisks.filter(r => r.exceedsTolerance).length} of {sortedRisks.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-2 c-border-teal shadow-md rounded-lg p-6 bg-white border-l-4 c-border-teal">
          <h3 className="text-xl font-bold c-text-navy mb-4">Risk Summary</h3>
          <div className="grid grid-cols-4 gap-3">
            {[["EXTREME","purple",levels.e],["HIGH","red",levels.h],["MODERATE","yellow",levels.m],["LOW","green",levels.l]].map(([lbl,col,n]) => (
              <div key={lbl} className={"rounded-lg p-3 text-center bg-" + col + "-50 border border-" + col + "-200"}>
                <div className={"text-2xl font-bold text-" + col + "-700"}>{n}</div>
                <div className="text-xs text-gray-600">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
        {highPri.length > 0 && (
          <div className="border-2 border-red-300 rounded-lg p-6 bg-red-50">
            <h3 className="text-xl font-bold c-text-navy mb-4">Top Priority Risks</h3>
            <div className="space-y-3">
              {highPri.slice(0, 5).map((risk, i) => {
                const riskLevel = risk.residualRisk >= 10 ? "EXTREME" : "HIGH";
                const bgColor = risk.residualRisk >= 10 ? "c-bg-extreme" : "bg-red-100";
                const textColor = risk.residualRisk >= 10 ? "c-text-navy" : "text-red-600";
                return (
                  <div key={risk.threat} className="bg-white rounded-lg p-4 border-2 c-border-gray">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold c-text-navy">#{i + 1} </span>
                        <span className="font-semibold c-text-navy">{risk.threat}</span>
                        <p className="text-sm text-gray-600 mt-1">
                          Risk Index: {getRiskDisplayScore(risk.residualRisk)}/100 <span className="text-xs text-gray-400">(raw: {risk.residualRisk.toFixed(2)}/25)</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {risk.exceedsTolerance && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">EXCEEDS TOLERANCE</span>}
                        <div className={"px-3 py-1 rounded-full font-semibold text-sm " + bgColor + " " + textColor}>{riskLevel}</div>
                      </div>
                    </div>
                    {risk.treatment && <p className="text-sm mt-2"><span className="font-medium">Treatment:</span> {risk.treatment}</p>}
                    {risk.estimatedCost && <p className="text-sm mt-1"><span className="font-medium">Cost:</span> {risk.estimatedCost}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {highPri.length > 0 && (
          <div className="border-2 c-border-teal shadow-md rounded-lg p-6 c-bg-light">
            <h3 className="text-xl font-bold c-text-navy mb-4">Recommended Control Improvements</h3>
            <p className="text-sm c-text-navy mb-4">Based on identified HIGH and EXTREME risks, implement these controls to reduce residual risk:</p>
            <div className="space-y-4">
              {highPri.slice(0, 5).map((risk) => {
                const threat = d.threats.find(t => t.name === risk.threat);
                const allControls = getAllControlsFlat(d.controls);
                const applicableControls = THREAT_CONTROL_MAP[risk.threat]?.controls || [];
                
                // Find weak controls (score < 3) that apply to this threat
                const weakControls = applicableControls
                  .map(ctrlKey => allControls.find(c => c.key === ctrlKey))
                  .filter(c => c && c.score > 0 && c.score < 3)
                  .sort((a, b) => a.score - b.score); // Weakest first
                
                if (weakControls.length === 0) return null;
                
                return (
                  <div key={risk.threat} className="bg-white rounded-lg p-4 border-2 c-border-light">
                    <h4 className="font-semibold c-text-navy mb-2">To mitigate: {risk.threat}</h4>
                    <ul className="space-y-2">
                      {weakControls.slice(0, 3).map(ctrl => {
                        const recommendations = {
                          fencing: "Upgrade to 8' chain-link with 3-strand barbed wire, repair gaps, anti-climb measures",
                          gates: "Install high-security locks, automated access control, vehicle barriers",
                          lighting: "Add perimeter LED lighting with backup power, eliminate dark zones",
                          bollards: "Install crash-rated bollards (K4/K8) at vehicle approach points",
                          signage: "Post clear no-trespassing signs with contact info at all entry points",
                          locks: "Replace with high-security cylinders, implement key control program",
                          cardReaders: "Deploy card readers at all access points, integrate with monitoring",
                          visitorMgmt: "Implement sign-in system, require escorts, issue temporary badges",
                          credentialAcct: "Deploy badge tracking system, prompt revocation procedures",
                          cctv: "Install megapixel cameras with 30-day retention, active monitoring",
                          intrusion: "Deploy perimeter sensors (fence-mounted, volumetric), integrate with SOC",
                          patrols: "Schedule regular patrols with documented rounds, mobile response capability",
                          monitoring: "Establish 24/7 SOC with video verification and dispatch protocols",
                          security: "Improve coordination with law enforcement, establish MOU, reduce response time",
                          communications: "Install redundant communications (radio + cellular), test quarterly",
                          drone: "Deploy RF/radar drone detection system with alert protocols",
                          enclosures: "Add ballistic-rated enclosures for critical equipment",
                          redundancy: "Implement N+1 redundancy, geographic diversity for critical systems"
                        };
                        
                        return (
                          <li key={ctrl.key} className="text-sm flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 c-text-teal mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium">{getControlLabel(ctrl.key)}</span> (currently {ctrl.score}/5)
                              <p className="text-gray-600 mt-0.5">{recommendations[ctrl.key] || "Improve implementation and maintenance"}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}
        {totalCost > 0 && (
          <div className="border-2 c-border-teal shadow-md rounded-lg p-6 bg-white border-l-4 c-border-teal">
            <h3 className="text-xl font-bold c-text-navy mb-3">Budget Summary</h3>
            <div className="c-bg-light rounded-lg p-4 flex justify-between items-center">
              <span className="c-text-navy font-medium">Total Estimated Treatment Cost</span>
              <span className="text-2xl font-bold c-text-teal">${totalCost.toLocaleString()}</span>
            </div>
          </div>
        )}
        <div className="border-2 c-border-teal shadow-md rounded-lg p-6 bg-white border-l-4 c-border-teal">
          <h3 className="text-xl font-bold c-text-navy mb-4">Key Control Gaps</h3>
          <p className="text-sm text-gray-600 mb-4">Layered security approach analysis: Controls scoring below 3 (Adequate) create exploitable gaps.</p>
          <div className="space-y-4">
            {/* Perimeter Security Layer */}
            {(() => {
              const perimeterControls = [
                { key: "fencing", name: "Fencing", score: d.controls.perimeter?.fencing?.score || 1, notes: d.controls.perimeter?.fencing?.notes },
                { key: "gates", name: "Gates", score: d.controls.perimeter?.gates?.score || 1, notes: d.controls.perimeter?.gates?.notes },
                { key: "lighting", name: "Lighting", score: d.controls.perimeter?.lighting?.score || 1, notes: d.controls.perimeter?.lighting?.notes },
                { key: "bollards", name: "Bollards", score: d.controls.perimeter?.bollards?.score || 1, notes: d.controls.perimeter?.bollards?.notes },
              ];
              const weakPerimeter = perimeterControls.filter(c => c.score < 3);
              if (weakPerimeter.length === 0) return null;
              return (
                <div className="border border-orange-300 rounded-lg p-4 bg-orange-50">
                  <h4 className="font-semibold c-text-navy mb-2">🔴 Perimeter Security Layer</h4>
                  <p className="text-sm c-text-navy mb-2">Weak perimeter allows easy site access, undermining all interior controls.</p>
                  <ul className="space-y-1">
                    {weakPerimeter.map(c => (
                      <li key={c.key} className="text-sm">
                        <span className="font-medium">{c.name}:</span> 
                        <span className={c.score === 1 ? "text-red-600 font-bold" : "text-orange-600 font-semibold"}> Score {c.score}/5</span> — 
                        {c.score === 1 && " Ineffective, provides no delay"}
                        {c.score === 2 && " Weak, easily bypassed"}
                        {c.notes && <div className="text-xs text-gray-600 italic mt-0.5 ml-4">Note: {c.notes}</div>}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-orange-700 mt-2"><strong>Impact:</strong> Material theft, vandalism, and trespassing threats can easily penetrate site.</p>
                </div>
              );
            })()}
            
            {/* Detection & Monitoring Layer */}
            {(() => {
              const detectionControls = [
                { key: "cctv", name: "CCTV", score: d.controls.detection?.cctv?.score || 1, notes: d.controls.detection?.cctv?.notes },
                { key: "intrusion", name: "Intrusion Detection", score: d.controls.detection?.intrusion?.score || 1, notes: d.controls.detection?.intrusion?.notes },
                { key: "monitoring", name: "SOC", score: d.controls.response?.monitoring?.score || 1, notes: d.controls.response?.monitoring?.notes },
              ];
              const weakDetection = detectionControls.filter(c => c.score < 3);
              if (weakDetection.length === 0) return null;
              return (
                <div className="border border-red-300 rounded-lg p-4 bg-red-50">
                  <h4 className="font-semibold c-text-navy mb-2">🔴 Detection & Monitoring Layer</h4>
                  <p className="text-sm c-text-navy mb-2">Without reliable detection, incidents discovered hours/days later (forensic only, not preventative).</p>
                  <ul className="space-y-1">
                    {weakDetection.map(c => (
                      <li key={c.key} className="text-sm">
                        <span className="font-medium">{c.name}:</span>
                        <span className={c.score === 1 ? "text-red-600 font-bold" : "text-orange-600 font-semibold"}> Score {c.score}/5</span> —
                        {c.score === 1 && " No real-time monitoring"}
                        {c.score === 2 && " Inconsistent/delayed detection"}
                        {c.notes && <div className="text-xs text-gray-600 italic mt-0.5 ml-4">Note: {c.notes}</div>}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-red-700 mt-2"><strong>Impact:</strong> Attacks complete before discovery. No opportunity to interrupt theft, vandalism, or sabotage.</p>
                </div>
              );
            })()}
            
            {/* Response Capability Layer */}
            {(() => {
              const responseControls = [
                { key: "security", name: "Security & LE Response", score: d.controls.response?.security?.score || 1, notes: d.controls.response?.security?.notes },
                { key: "communications", name: "Communications", score: d.controls.response?.communications?.score || 1, notes: d.controls.response?.communications?.notes },
              ];
              const weakResponse = responseControls.filter(c => c.score < 3);
              const responseTime = parseInt(d.facility.responseTime) || 999;
              if (weakResponse.length === 0 && responseTime < 20) return null;
              return (
                <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50">
                  <h4 className="font-semibold c-text-navy mb-2">⚠️ Response Capability Layer</h4>
                  <p className="text-sm c-text-navy mb-2">Slow or unreliable response means detection is forensic, not preventative.</p>
                  <ul className="space-y-1">
                    {weakResponse.map(c => (
                      <li key={c.key} className="text-sm">
                        <span className="font-medium">{c.name}:</span>
                        <span className={c.score === 1 ? "text-red-600 font-bold" : "text-orange-600 font-semibold"}> Score {c.score}/5</span> —
                        {c.score === 1 && " No coordinated response"}
                        {c.score === 2 && " Unreliable or slow"}
                        {c.notes && <div className="text-xs text-gray-600 italic mt-0.5 ml-4">Note: {c.notes}</div>}
                      </li>
                    ))}
                    {responseTime >= 20 && (
                      <li className="text-sm">
                        <span className="font-medium">Response Time:</span> {responseTime} min — Exceeds typical attack duration (10-15 min)
                      </li>
                    )}
                  </ul>
                  <p className="text-sm text-yellow-700 mt-2"><strong>Impact:</strong> Even if detected, responders arrive after theft/damage is complete.</p>
                </div>
              );
            })()}
            
            {/* Asset Hardening Layer */}
            {(() => {
              const hardeningControls = [
                { key: "enclosures", name: "Hardened Enclosures", score: d.controls.hardening?.enclosures?.score || 1, notes: d.controls.hardening?.enclosures?.notes },
                { key: "redundancy", name: "Redundancy", score: d.controls.hardening?.redundancy?.score || 1, notes: d.controls.hardening?.redundancy?.notes },
              ];
              const weakHardening = hardeningControls.filter(c => c.score < 3);
              if (weakHardening.length === 0) return null;
              return (
                <div className="border-2 c-border-gray rounded-lg p-4 c-bg-light">
                  <h4 className="font-semibold c-text-navy mb-2">ℹ️ Asset Hardening Layer</h4>
                  <p className="text-sm c-text-navy mb-2">Last line of defense. If perimeter/detection fail, hardening delays attack completion.</p>
                  <ul className="space-y-1">
                    {weakHardening.map(c => (
                      <li key={c.key} className="text-sm">
                        <span className="font-medium">{c.name}:</span>
                        <span className={c.score === 1 ? "text-red-600 font-bold" : "text-orange-600 font-semibold"}> Score {c.score}/5</span> —
                        {c.score === 1 && " Open access, no delay"}
                        {c.score === 2 && " Minimal protection"}
                        {c.notes && <div className="text-xs text-gray-600 italic mt-0.5 ml-4">Note: {c.notes}</div>}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm c-text-teal mt-2"><strong>Impact:</strong> Critical assets unprotected once intruder is on-site.</p>
                </div>
              );
            })()}
            
            {/* No Gaps Found */}
            {(() => {
              const allControls = [
                ...Object.values(d.controls.perimeter || {}),
                ...Object.values(d.controls.detection || {}),
                ...Object.values(d.controls.response || {}),
                ...Object.values(d.controls.hardening || {})
              ];
              const weakControls = allControls.filter(c => c.score < 3);
              if (weakControls.length > 0) return null;
              return (
                <div className="border border-green-300 rounded-lg p-4 bg-green-50 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-700 font-medium">All security layers scoring 3 (Adequate) or higher. Strong layered defense posture.</p>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="flex justify-center">
          <button onClick={exportReport} className="flex items-center space-x-2 c-bg-teal  text-white px-6 py-3 rounded-lg font-semibold transition-colors">
            <Download className="w-5 h-5" /><span>Export Assessment Report</span>
          </button>
        </div>
        <div className="c-bg-light border-2 c-border-light rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">Assessment of <strong>{d.facility.facilityId || "facility"}</strong> completed on {d.facility.date} by {d.facility.assessor || "Not specified"}</p>
        </div>
      </div>
    );
  };

  // ── Step validation ──────────────────────────────────────────────────────
  const canAdvance = useMemo(() => {
    if (step === 0) return !!d.facility.type; // Must select subvertical
    if (step === 1) return Object.values(d.criticality.assetPresence).some(v => v === true); // At least 1 asset present
    if (step === 2) return d.threats.length > 0; // At least 1 threat selected
    return true;
  }, [step, d.facility.type, d.criticality.assetPresence, d.threats.length]);

  const stepWarning = useMemo(() => {
    if (step === 0 && !d.facility.type) return "Select a subvertical to continue";
    if (step === 1 && !Object.values(d.criticality.assetPresence).some(v => v === true)) return "Confirm at least one asset as present";
    if (step === 2 && d.threats.length === 0) return "Select at least one threat";
    return null;
  }, [step, d.facility.type, d.criticality.assetPresence, d.threats.length]);

  // ── SHELL ─────────────────────────────────────────────────────────────────
  const STEPS = [
    { name: "Facility Profile",      Icon: Building,      View: FacilityProfile      },
    { name: "Asset Criticality",     Icon: AlertTriangle, View: AssetCriticality     },
    { name: "Threat Identification", Icon: Eye,           View: ThreatIdentification },
    { name: "Control Assessment",    Icon: Shield,        View: ControlAssessment    },
    { name: "Residual Risk",         Icon: Lock,          View: RiskAnalysis         },
    { name: "Summary & Report",      Icon: CheckCircle,   View: Summary              },
  ];
  const { View } = STEPS[step];

  return (
    <div className="min-h-screen c-bg-light p-4">
      <style>{'\n      .c-text-navy   { color: #0E2C49; }\n      .c-text-teal   { color: #054163; }\n      .c-text-red    { color: #C2090E; }\n      .c-text-gray   { color: #8D98AC; }\n      .c-text-light  { color: #EEF2F4; }\n      .c-bg-navy     { background-color: #0E2C49; }\n      .c-bg-teal     { background-color: #054163; }\n      .c-bg-red      { background-color: #C2090E; }\n      .c-bg-gray     { background-color: #8D98AC; }\n      .c-bg-light    { background-color: #EEF2F4; }\n      .c-bg-extreme  { background-color: #d0d9e3; }\n      .c-border-navy    { border-color: #0E2C49; }\n      .c-border-teal    { border-color: #054163; }\n      .c-border-red     { border-color: #C2090E; }\n      .c-border-gray    { border-color: #8D98AC; }\n      .c-border-light   { border-color: #EEF2F4; }\n      .c-border-extreme { border-color: #d0d9e3; }\n      .c-gradient-header { background: linear-gradient(to right, #0E2C49, #054163, #0E2C49); }\n      .c-gradient-btn    { background: linear-gradient(to right, #054163, #0E2C49); }\n      .c-disabled-gray:disabled { background-color: #8D98AC; }\n'}</style>

      {/* Storage warning */}
      {saveWarning && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-sm text-red-800">{saveWarning}</div>
        </div>
      )}

      {/* Resume previous assessment prompt */}
      {showResumePrompt && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold c-text-navy">Resume Previous Assessment?</p>
              <p className="text-xs text-gray-600 mt-1">Found saved data for <strong>{d.facility.facilityId || d.facility.clientName || "facility"}</strong> from {d.facility.date}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowResumePrompt(false)} className="px-4 py-2 c-bg-teal text-white rounded font-medium text-sm">Continue</button>
              <button onClick={clearSavedData} className="px-4 py-2 bg-white border-2 c-border-gray text-gray-600 rounded font-medium text-sm">Start New</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="c-gradient-header rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 c-text-red flex-shrink-0" />
              <h1 className="text-2xl font-bold text-white">Physical Security Risk Assessment Tool</h1>
            </div>
            <div style={{width:48,height:48,background:"#C2090E",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:"bold",fontSize:10,textAlign:"center",lineHeight:1.2}}>PSR<br/>Tool</div>
          </div>
        </div>
        <div className="c-gradient-header rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-start">
            {STEPS.map(({ name, Icon }, i) => (
              <React.Fragment key={i}>
                <div className={"flex flex-col items-center cursor-pointer transition-opacity " + (step === i || step > i ? "opacity-100" : "opacity-40")} onClick={() => setStep(i)}>
                  <div className={"w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mb-2 " + (step === i ? "c-gradient-btn text-white font-bold" : step > i ? "c-bg-red text-white" : "c-bg-light c-text-gray")}>
                    {step > i ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={"text-xs text-center font-medium leading-tight max-w-[72px] text-white"}>{name}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={"flex-1 h-1 mx-2 mt-6 flex-shrink " + (step > i ? "c-bg-red" : "c-bg-light")} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6 border-l-8 c-border-teal">
          <View />
        </div>
        {stepWarning && (
          <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2 text-sm text-yellow-800 text-center">{stepWarning}</div>
        )}
        <div className="flex justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)}
              className="px-6 py-3 c-bg-gray text-white rounded-lg font-semibold hover:c-bg-navy transition-colors">
              Previous
            </button>
          ) : <div />}
          <button onClick={() => canAdvance && setStep(Math.min(STEPS.length - 1, step + 1))} disabled={step === STEPS.length - 1 || !canAdvance}
            className="px-6 py-3 c-gradient-btn text-white font-bold rounded-lg font-semibold disabled:opacity-50 transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

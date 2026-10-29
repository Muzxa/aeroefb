import Icon from "./Icon";

export default function RouteMap({ departure = "OPLA", destination = "OPIS" }) {
  return (
    <div
      className="route-map"
      role="img"
      aria-label={`Illustrative route from ${departure} to ${destination}. Schematic only, not for navigation.`}
    >
      <svg viewBox="0 0 560 330" className="map-drawing" aria-hidden="true">
        <defs>
          <pattern
            id="map-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M40 0H0V40"
              fill="none"
              stroke="#d6dfdf"
              strokeWidth=".6"
            />
          </pattern>
        </defs>
        <rect width="560" height="330" fill="#eef2ef" />
        <rect width="560" height="330" fill="url(#map-grid)" />
        <g fill="#e1e8df" stroke="#d1dccc" strokeWidth="1">
          <path d="M0 0h165l-35 45-14 64-60 40L0 131Z" />
          <path d="m275 0 27 42 71 16 24-11 40 61 72 20 51-15V0Z" />
          <path d="m0 225 95-9 41 39 40 21-9 54H0Z" />
          <path d="m398 234 60-21 102 34v83H423l-20-49Z" />
        </g>
        <g fill="none" stroke="#fff" strokeWidth="5">
          <path d="M-10 293 115 190 239 189 363 72 588 61" />
          <path d="M104-12 160 88 239 189 293 259 368 345" />
          <path d="m-20 85 180 3 137 48 118 101 165 19" />
        </g>
        <g fill="none" stroke="#d0d8cf" strokeWidth="1">
          <path d="M-10 293 115 190 239 189 363 72 588 61" />
          <path d="M104-12 160 88 239 189 293 259 368 345" />
        </g>
        <path
          d="m395-15-28 36 9 51-40 32-3 57-54 17-14 72-41 31-7 64"
          fill="none"
          stroke="#bad9e2"
          strokeWidth="5"
        />
        <g
          fill="#526052"
          fontFamily="system-ui"
          fontSize="10"
          letterSpacing="2"
        >
          <text x="52" y="65">
            NORTHERN REGION
          </text>
          <text x="340" y="287">
            PUNJAB
          </text>
        </g>
        <path
          d="M161 249Q216 108 393 84"
          fill="none"
          stroke="#1e40af"
          strokeWidth="2.5"
          strokeDasharray="7 5"
        />
        <circle cx="161" cy="249" r="16" fill="#1e40af" opacity=".1" />
        <circle
          cx="161"
          cy="249"
          r="6"
          fill="#fff"
          stroke="#1e40af"
          strokeWidth="3"
        />
        <circle cx="393" cy="84" r="16" fill="#1e40af" opacity=".1" />
        <circle
          cx="393"
          cy="84"
          r="6"
          fill="#1e40af"
          stroke="#fff"
          strokeWidth="3"
        />
        <g fontFamily="system-ui" fontSize="14" fontWeight="700" fill="#172022">
          <text x="119" y="282">
            {departure}
          </text>
          <text x="409" y="75">
            {destination}
          </text>
        </g>
        <g transform="translate(264 133) rotate(45)">
          <circle r="18" fill="white" stroke="#d4ddd8" />
          <path d="m0-12 2 8 9 6v2L1 1v9h-2V1l-10 3V2l9-6z" fill="#1e40af" />
        </g>
      </svg>
      <span className="map-label">
        <Icon name="map" size={14} /> Route schematic
      </span>
      <span className="map-north">
        N <span>↑</span>
      </span>
      <span className="map-disclaimer">Not for navigation</span>
    </div>
  );
}

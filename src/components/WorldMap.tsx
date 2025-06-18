import React, { useState, useEffect } from 'react';
import { 
  ComposableMap, 
  Geographies, 
  Geography 
} from 'react-simple-maps';
import { Box, Tooltip } from '@mui/material';
import countryBorders from './countryBorders.json';

interface ForeignMinistry {
  country: string;
  code: string;
  foreign_ministry_domain: string;
}

const WorldMap: React.FC = () => {
  const [foreignMinistries, setForeignMinistries] = useState<ForeignMinistry[]>([]);

  useEffect(() => {
    // Load foreign ministry data
    fetch('/national_governments.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            return {
              country: values[0]?.trim() || '',
              code: values[1]?.trim() || '',
              foreign_ministry_domain: values[7]?.trim() || ''
            };
          })
          .filter(item => item.code && item.foreign_ministry_domain);
        
        setForeignMinistries(data);
      })
      .catch(error => {
        console.error('Error loading foreign ministry data:', error);
      });
  }, []);

  const getForeignMinistryForCountry = (countryName: string, isoCode: string) => {
    // First try to match by ISO code (most reliable)
    let ministry = foreignMinistries.find(fm => 
      fm.code === isoCode
    );
    
    // If no match by ISO code, try by country name
    if (!ministry) {
      ministry = foreignMinistries.find(fm => 
        fm.country.toLowerCase() === countryName.toLowerCase()
      );
    }
    
    return ministry;
  };

  const handleCountryClick = (countryName: string, isoCode: string) => {
    const ministry = getForeignMinistryForCountry(countryName, isoCode);
    if (ministry) {
      const url = ministry.foreign_ministry_domain.startsWith('http') 
        ? ministry.foreign_ministry_domain 
        : `https://${ministry.foreign_ministry_domain}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: '800px',
      height: '100%',
      overflow: 'hidden',
      mb: 4
    }}>
      <ComposableMap
        projectionConfig={{ 
          scale: 140,
          center: [20, 20]
        }}
        width={800}
        height={400}
        style={{
          width: '100%',
          height: 'auto'
        }}
      >
        <Geographies geography={countryBorders}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryName = geo.properties.name;
              const isoCode = geo.properties.iso_code;
              const ministry = getForeignMinistryForCountry(countryName, isoCode);
              const hasMinistry = !!ministry;

              return (
                <Tooltip 
                  key={geo.rsmKey}
                  title={hasMinistry ? `${countryName} - Click to visit Foreign Ministry` : countryName}
                  arrow 
                  placement="top"
                >
                  <Geography
                    geography={geo}
                    fill={hasMinistry ? "#3949ab" : "#E4E5E9"}
                    stroke="#D6D6DA"
                    style={{
                      default: { 
                        outline: 'none', 
                        fill: hasMinistry ? "#3949ab" : "#E4E5E9",
                        cursor: hasMinistry ? 'pointer' : 'default'
                      },
                      hover: { 
                        outline: 'none', 
                        fill: hasMinistry ? "#1a237e" : "#D6D6DA",
                        cursor: hasMinistry ? 'pointer' : 'default'
                      },
                      pressed: { 
                        outline: 'none',
                        fill: hasMinistry ? "#0d47a1" : "#D6D6DA"
                      }
                    }}
                    onClick={() => {
                      if (hasMinistry) {
                        handleCountryClick(countryName, isoCode);
                      }
                    }}
                  />
                </Tooltip>
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </Box>
  );
};

export default WorldMap;
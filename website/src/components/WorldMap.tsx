import React, { useState, useEffect } from 'react';
import { 
  ComposableMap, 
  Geographies, 
  Geography 
} from 'react-simple-maps';
import { Box, Tooltip } from '@mui/material';
import countryBorders from './countryBorders.json';

export type StatusType = 'website' | 'robots' | 'statements';

interface WorldMapProps {
  statusType: StatusType;
}

interface ForeignMinistry {
  country: string;
  code: string;
  foreign_affairs_ministry_url: string;
  http_response_code: string;
  robots_txt: string;
}

const WorldMap: React.FC<WorldMapProps> = ({ statusType }) => {
  const [foreignMinistries, setForeignMinistries] = useState<ForeignMinistry[]>([]);

  useEffect(() => {
    // Load foreign ministry data
    fetch('/national_governments.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        if (lines.length === 0) return;
        
        // Parse header to get column indices
        const headers = lines[0].split(',').map(h => h.trim());
        const countryIndex = headers.findIndex(h => h === 'country');
        const codeIndex = headers.findIndex(h => h === 'code');
        const foreignAffairsIndex = headers.findIndex(h => h === 'foreign_affairs_ministry_url');
        const httpResponseIndex = headers.findIndex(h => h === 'http_response_code');
        const robotsTxtIndex = headers.findIndex(h => h === 'robots_txt');
        
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            return {
              country: countryIndex >= 0 ? (values[countryIndex]?.trim() || '') : '',
              code: codeIndex >= 0 ? (values[codeIndex]?.trim() || '') : '',
              foreign_affairs_ministry_url: foreignAffairsIndex >= 0 ? (values[foreignAffairsIndex]?.trim() || '') : '',
              http_response_code: httpResponseIndex >= 0 ? (values[httpResponseIndex]?.trim() || '') : '',
              robots_txt: robotsTxtIndex >= 0 ? (values[robotsTxtIndex]?.trim() || '') : ''
            };
          })
          .filter(item => item.code && item.foreign_affairs_ministry_url);
        
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
      const url = ministry.foreign_affairs_ministry_url.startsWith('http')
        ? ministry.foreign_affairs_ministry_url
        : `https://${ministry.foreign_affairs_ministry_url}`;
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
              
              // Determine color based on selected status type (grey shades only)
              let fillColor = "#E4E5E9"; // Light gray for no ministry
              let tooltipText = countryName;
              
              if (ministry) {
                let responseCode = '';
                let statusLabel = '';
                
                if (statusType === 'website') {
                  responseCode = ministry.http_response_code;
                  statusLabel = 'Website';
                } else if (statusType === 'robots') {
                  responseCode = ministry.robots_txt;
                  statusLabel = 'Robots.txt';
                } else if (statusType === 'statements') {
                  responseCode = '404'; // Map empty statements_txt to 404 (not found)
                  statusLabel = 'Statements.txt';
                }
                
                if (responseCode === '200') {
                  fillColor = "#424242"; // Dark gray for working/available
                  tooltipText = `${countryName} - ${statusLabel} Available (${responseCode}) - Click to visit`;
                } else if (responseCode === '301' || responseCode === '302') {
                  fillColor = "#616161"; // Medium-dark gray for redirects
                  tooltipText = `${countryName} - ${statusLabel} Redirect (${responseCode}) - Click to visit`;
                } else if (responseCode === '403') {
                  fillColor = "#9E9E9E"; // Medium gray for forbidden/bot protection
                  tooltipText = `${countryName} - ${statusLabel} Blocked (${responseCode}) - May have bot protection`;
                } else if (responseCode === '404') {
                  fillColor = "#BDBDBD"; // Light-medium gray for not found
                  tooltipText = `${countryName} - ${statusLabel} Not Found (${responseCode})`;
                } else if (responseCode.startsWith('ERROR_')) {
                  fillColor = "#BDBDBD"; // Light-medium gray for SSL/certificate errors
                  tooltipText = `${countryName} - ${statusLabel} Error (${responseCode})`;
                } else if (responseCode === 'TIMEOUT') {
                  fillColor = "#757575"; // Medium gray for timeouts
                  tooltipText = `${countryName} - ${statusLabel} Timeout - Click to try`;
                } else if (responseCode) {
                  fillColor = "#757575"; // Medium gray for other codes
                  tooltipText = `${countryName} - ${statusLabel} HTTP ${responseCode} - Click to visit`;
                } else {
                  fillColor = "#757575"; // Medium gray for ministry with no response code
                  tooltipText = `${countryName} - ${statusLabel} Status Unknown - Click to visit Ministry of Foreign Affairs`;
                }
              }

              return (
                <Tooltip
                  key={geo.rsmKey}
                  title={tooltipText}
                  arrow
                  placement="top"
                >
                  <Geography
                    geography={geo}
                    fill={fillColor}
                    stroke="#D6D6DA"
                    style={{
                      default: {
                        outline: 'none',
                        fill: fillColor,
                        cursor: hasMinistry ? 'pointer' : 'default'
                      },
                      hover: {
                        outline: 'none',
                        fill: hasMinistry ? (fillColor === "#424242" ? "#212121" :
                                           fillColor === "#616161" ? "#424242" :
                                           fillColor === "#9E9E9E" ? "#757575" :
                                           fillColor === "#BDBDBD" ? "#9E9E9E" :
                                           fillColor === "#757575" ? "#616161" : "#424242") : "#D6D6DA",
                        cursor: hasMinistry ? 'pointer' : 'default'
                      },
                      pressed: {
                        outline: 'none',
                        fill: hasMinistry ? "#616161" : "#D6D6DA"
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
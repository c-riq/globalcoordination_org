import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent, Link } from '@mui/material';
import { useState, useEffect } from 'react';
import WorldMap, { StatusType } from './WorldMap';

type ViewType = StatusType | 'ukraine' | 'gaza' | 'iran' | 'climate' | 'rights' | 'sanctions' | 'tariffs';

interface AnalysisData {
  countryPositions: Array<{
    topic: string;
    countries: Array<{
      [countryCode: string]: {
        exact_quote: string;
        summarised_stance_in_english: string;
        relevance_to_topic: number;
        clarity_of_stance: number;
        verification: string;
        verified: boolean;
      };
    }>;
  }>;
  dataContext: string;
}

interface ForeignMinistry {
  country: string;
  code: string;
  foreign_affairs_ministry_url: string;
  http_response_code: string;
  robots_txt: string;
}

function LandingPage() {
  const [viewType, setViewType] = useState<ViewType>('website');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [foreignMinistries, setForeignMinistries] = useState<ForeignMinistry[]>([]);

  useEffect(() => {
    // Load analysis data
    fetch('/latest-analysis.json')
      .then(response => response.json())
      .then(data => setAnalysisData(data))
      .catch(error => console.error('Error loading analysis data:', error));

    // Load foreign ministry data
    fetch('/national_governments.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        if (lines.length === 0) return;
        
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
      .catch(error => console.error('Error loading foreign ministry data:', error));
  }, []);

  const getForeignMinistryForCountry = (countryCode: string) => {
    return foreignMinistries.find(fm => fm.code === countryCode);
  };

  const cropText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleViewChange = (event: SelectChangeEvent) => {
    setViewType(event.target.value as ViewType);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 3,
        pt: { xs: 12, sm: 12 },
        pb: 8,
        backgroundColor: 'background.default',
      }}
    >
      <Box sx={{
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 2, sm: 3 }
      }}>
        {/* Title Section */}
        <Box sx={{
          textAlign: 'center',
          mb: { xs: 1, sm: 2 }
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            mb: 1,
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                height: '50px',
                width: 'auto'
              }}
            />
            <Typography
              variant="h5"
              component="h1"
              sx={{
                color: '#1a237e',
                fontWeight: 400,
                fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.75rem' },
                fontFamily: '"Helvetica Neue", Arial, sans-serif'
              }}
            >
              Adoption of Stated.network Coordination Protocol
            </Typography>
          </Box>
          <Typography
            variant="body2"
            component="a"
            href="https://stated.network"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#1a237e',
              textDecoration: 'underline',
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              fontFamily: '"Helvetica Neue", Arial, sans-serif',
              opacity: 0.8,
              '&:hover': {
                opacity: 1
              }
            }}
          >
            Learn more about the protocol →
          </Typography>
        </Box>
        
        {/* Filter and Legend Section */}
        <Box sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          mb: 2
        }}>
          {/* Status Selector */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}>
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <Select
                value={viewType}
                onChange={handleViewChange}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.9rem',
                  '& .MuiSelect-select': {
                    py: 1.5
                  }
                }}
              >
                <MenuItem value="website">Ministry Website Status</MenuItem>
                <MenuItem value="robots">Robots.txt Status</MenuItem>
                <MenuItem value="statements">Statements.txt Status</MenuItem>
                <MenuItem value="ukraine">📄 Website Text Analysis: Ukraine Conflict</MenuItem>
                <MenuItem value="gaza">📄 Website Text Analysis: Israel/Gaza Conflict</MenuItem>
                <MenuItem value="iran">📄 Website Text Analysis: Iran</MenuItem>
                <MenuItem value="climate">📄 Website Text Analysis: Climate Change</MenuItem>
                <MenuItem value="rights">📄 Website Text Analysis: Human Rights</MenuItem>
                <MenuItem value="sanctions">📄 Website Text Analysis: Sanctions</MenuItem>
                <MenuItem value="tariffs">📄 Website Text Analysis: Tariffs</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          {/* Legend */}
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 2,
            px: 2
          }}>
            {['ukraine', 'gaza', 'iran', 'climate', 'rights', 'sanctions', 'tariffs'].includes(viewType) ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#1B5E20', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Website contains text mentioning this topic</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#E4E5E9', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>No text found mentioning this topic</Typography>
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#424242', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    {viewType === 'website' ? 'Working (200)' :
                     viewType === 'robots' ? 'Available (200)' :
                     'Available (200)'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#616161', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Redirect (301/302)</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#9E9E9E', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Blocked (403)</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#BDBDBD', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    {viewType === 'website' ? 'SSL Error' : 'Not Found (404)'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#757575', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Timeout/Other</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#E4E5E9', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>No Foreign Ministry URL</Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
        
        {/* World Map Section */}
        <Box sx={{
          width: '100%',
          height: { xs: '220px', sm: '400px', md: '500px', lg: '500px' },
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          <WorldMap statusType={viewType as StatusType} analysisData={analysisData} />
        </Box>

        {/* Compact Stances List for Topic Views */}
        {['ukraine', 'gaza', 'iran', 'climate', 'rights', 'sanctions', 'tariffs'].includes(viewType) && analysisData && (
          <Box sx={{ width: '100%', maxWidth: '1000px', mt: 3 }}>
            {(() => {
              const topicMap: { [key: string]: string } = {
                'ukraine': 'Ukraine Conflict',
                'gaza': 'Israel/Gaza Conflict',
                'iran': 'Iran',
                'climate': 'Climate Change',
                'rights': 'Human Rights',
                'sanctions': 'Sanctions',
                'tariffs': 'Tariffs'
              };
              
              const targetTopic = topicMap[viewType];
              const topicData = analysisData.countryPositions.find(pos => pos.topic === targetTopic);
              
              if (!topicData) return null;
              
              // Filter for high-quality positions only
              const highQualityPositions = topicData.countries
                .map(countryObj => {
                  const [countryCode, data] = Object.entries(countryObj)[0];
                  return { countryCode, ...data };
                })
                .filter(pos => pos.relevance_to_topic >= 0.8 && pos.clarity_of_stance >= 0.8);
              
              if (highQualityPositions.length === 0) return null;
              
              return (
                <Box sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 2,
                  p: 2,
                  border: '1px solid #e0e0e0'
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#1a237e' }}>
                    {targetTopic} - Website Text ({highQualityPositions.length} countries)
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {highQualityPositions.map((pos, index) => {
                      const ministry = getForeignMinistryForCountry(pos.countryCode);
                      const ministryUrl = ministry ?
                        (ministry.foreign_affairs_ministry_url.startsWith('http')
                          ? ministry.foreign_affairs_ministry_url
                          : `https://${ministry.foreign_affairs_ministry_url}`) : null;
                      
                      return (
                        <Box key={index} sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          py: 1,
                          borderBottom: index < highQualityPositions.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{
                              fontWeight: 'bold',
                              color: '#1a237e',
                              minWidth: '30px'
                            }}>
                              {pos.countryCode}:
                            </Typography>
                            <Typography variant="body2" sx={{
                              flex: 1,
                              fontSize: '0.85rem',
                              fontWeight: 'medium'
                            }}>
                              {cropText(pos.summarised_stance_in_english, 120)}
                            </Typography>
                            {ministryUrl && (
                              <Link
                                href={ministryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  fontSize: '0.75rem',
                                  color: '#1a237e',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                              >
                                Source →
                              </Link>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            fontStyle: 'italic',
                            ml: '38px',
                            backgroundColor: '#f8f9fa',
                            p: 0.5,
                            borderRadius: 0.5,
                            border: '1px solid #e9ecef'
                          }}>
                            "{cropText(pos.exact_quote, 200)}"
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  <Typography variant="caption" sx={{
                    mt: 2,
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    textAlign: 'center'
                  }}>
                    Note: Text excerpts are from foreign ministry websites and may be taken out of context. Click "Source →" to view full context.
                  </Typography>
                </Box>
              );
            })()}
          </Box>
        )}
        
        {/* Footer */}
        <Box sx={{
          mt: 6,
          py: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
          width: '100%'
        }}>
          <Typography
            variant="body2"
            component="a"
            href="https://city-vote.com/about"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#1a237e',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontFamily: '"Helvetica Neue", Arial, sans-serif',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            About
          </Typography>
        </Box>
      </Box>
      
    </Box>
  );
}

export default LandingPage;
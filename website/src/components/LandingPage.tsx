import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useState, useEffect } from 'react';
import WorldMap, { StatusType } from './WorldMap';

type ViewType = StatusType | 'ukraine' | 'gaza' | 'iran' | 'climate' | 'rights';

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

function LandingPage() {
  const [viewType, setViewType] = useState<ViewType>('website');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    // Always load analysis data for the map
    fetch('/latest-analysis.json')
      .then(response => response.json())
      .then(data => setAnalysisData(data))
      .catch(error => console.error('Error loading analysis data:', error));
  }, []);

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
          <Typography
            variant="h5"
            component="h1"
            sx={{
              color: '#1a237e',
              fontWeight: 400,
              fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.75rem' },
              fontFamily: '"Helvetica Neue", Arial, sans-serif',
              mb: 1
            }}
          >
            Adoption of Stated.network Coordination Protocol
          </Typography>
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
                <MenuItem value="ukraine">Ukraine Conflict</MenuItem>
                <MenuItem value="gaza">Israel/Gaza Conflict</MenuItem>
                <MenuItem value="iran">Iran</MenuItem>
                <MenuItem value="climate">Climate Change</MenuItem>
                <MenuItem value="rights">Human Rights</MenuItem>
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
            {['ukraine', 'gaza', 'iran', 'climate', 'rights'].includes(viewType) ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#1B5E20', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Foreign ministry website contains text expressing a stance</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: '#E4E5E9', borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>No clear stance found</Typography>
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
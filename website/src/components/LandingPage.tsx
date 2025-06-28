import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useState } from 'react';
import WorldMap, { StatusType } from './WorldMap';

function LandingPage() {
  const [statusType, setStatusType] = useState<StatusType>('website');

  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatusType(event.target.value as StatusType);
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={statusType}
                onChange={handleStatusChange}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#424242', borderRadius: 1 }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                {statusType === 'website' ? 'Working (200)' :
                 statusType === 'robots' ? 'Available (200)' :
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
                {statusType === 'website' ? 'SSL Error' : 'Not Found (404)'}
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
          <WorldMap statusType={statusType} />
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
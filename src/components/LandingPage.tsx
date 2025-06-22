import { Box, Typography } from '@mui/material';
import WorldMap from './WorldMap';

function LandingPage() {
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
      {/* Small slogan for mobile screens */}
      <Typography 
        variant="caption" 
        sx={{ 
          display: { xs: 'block', md: 'none' },
          color: '#1a237e',
          fontWeight: 300,
          letterSpacing: '0.05em',
          fontSize: '0.75rem',
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
          mt: -3,
          mb: -1,
          opacity: 0.7,
          textAlign: 'center'
        }}
      >
        globalcoordination.org
      </Typography>
      
      <Box sx={{ 
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 2, sm: 3 }
      }}>
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
          {/* Slogan for non-mobile screens */}
          <Typography 
            variant="h6" 
            sx={{ 
              position: 'absolute',
              top: { xs: 0, sm: 0 },
              zIndex: 10,
              color: '#1a237e',
              fontWeight: 300,
              textAlign: 'center',
              letterSpacing: '0.12em',
              textTransform: 'none',
              fontFamily: '"Helvetica Neue", Arial, sans-serif',
              display: { xs: 'none', md: 'block' }
            }}
          >
            globalcoordination.org
          </Typography>
          <WorldMap />
        </Box>
        
        {/* Legend */}
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 2,
          mt: 2,
          px: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#424242', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Working (200)</Typography>
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
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>SSL Error</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#757575', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Timeout</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#E4E5E9', borderRadius: 1 }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>No Foreign Ministry URL</Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Footer */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'text.secondary',
        fontSize: '0.75rem',
        backgroundColor: 'background.default',
        borderTop: '1px solid',
        borderColor: 'divider',
        py: 1,
        px: 2,
        opacity: 0.95,
        backdropFilter: 'blur(8px)'
      }}>
        <Typography variant="caption" component="span">
          globalcoordination.org
        </Typography>
      </Box>
    </Box>
  );
}

export default LandingPage;
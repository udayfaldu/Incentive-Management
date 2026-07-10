import React from 'react';
import { InputAdornment, TextField } from '@mui/material';
import { SearchRounded } from '@mui/icons-material';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value, onChange, placeholder = 'Search...', id = 'search-bar',
}) => {
  return (
    <TextField
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="small"
      sx={{ minWidth: 220 }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

export default SearchBar;

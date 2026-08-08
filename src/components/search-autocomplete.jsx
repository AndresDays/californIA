import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useCallback, useState } from 'react';

const darkTheme = createTheme({
	palette: {
		mode: 'dark',
		primary: { main: '#53B9DB' },
		background: { paper: '#0d2137', default: '#020F23' },
		text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.55)' },
	},
	typography: {
		fontFamily: "'Codec Pro', sans-serif",
		fontSize: 14,
	},
	components: {
		MuiAutocomplete: {
			styleOverrides: {
				paper: {
					background: 'rgba(10, 25, 41, 0.98)',
					border: '1px solid rgba(83, 185, 219, 0.25)',
					backdropFilter: 'blur(12px)',
					borderRadius: '10px',
					boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
					marginTop: '4px',
				},
				listbox: {
					padding: '4px',
					'& .MuiAutocomplete-option': {
						borderRadius: '7px',
						padding: '10px 12px',
						fontSize: '0.88rem',
						'&[aria-selected="true"]': {
							background: 'rgba(83, 185, 219, 0.15)',
						},
						'&.Mui-focused': {
							background: 'rgba(83, 185, 219, 0.1)',
						},
					},
				},
				noOptions: {
					fontSize: '0.85rem',
					color: 'rgba(255,255,255,0.4)',
					padding: '12px',
				},
				loading: {
					fontSize: '0.85rem',
					color: 'rgba(83, 185, 219, 0.7)',
					padding: '12px',
				},
				clearIndicator: { color: 'rgba(255,255,255,0.35)' },
				popupIndicator: { color: 'rgba(255,255,255,0.35)' },
			},
		},
		MuiTextField: {
			styleOverrides: {
				root: {
					'& .MuiOutlinedInput-root': {
						background: 'rgba(10, 25, 41, 0.55)',
						borderRadius: '8px',
						fontSize: '0.9rem',
						fontFamily: "'Codec Pro', sans-serif",
						color: 'white',
						'& fieldset': {
							borderColor: 'rgba(83, 185, 219, 0.25)',
						},
						'&:hover fieldset': {
							borderColor: 'rgba(83, 185, 219, 0.5)',
						},
						'&.Mui-focused fieldset': {
							borderColor: '#53B9DB',
							borderWidth: '1px',
						},
					},
					'& .MuiInputLabel-root': {
						fontFamily: "'Codec Pro', sans-serif",
						fontSize: '0.85rem',
						color: 'rgba(255,255,255,0.45)',
						'&.Mui-focused': { color: '#53B9DB' },
					},
					'& input::placeholder': {
						color: 'rgba(255,255,255,0.6)',
						opacity: 1,
					},
				},
			},
		},
	},
});

/**
 * SearchAutocomplete — buscador asíncrono temático del proyecto.
 *
 * Props:
 *   buscar(termino)          → async, debe devolver array de opciones
 *   onSeleccionar(opcion)    → callback al seleccionar
 *   getLabel(opcion)         → string principal que se muestra en el input
 *   renderOpcion(opcion)     → JSX personalizado para cada fila del dropdown
 *   placeholder              → texto del input
 *   value                    → valor controlado (objeto opción o null)
 *   noOptionsText            → texto cuando no hay resultados
 *   minChars                 → mínimo de caracteres para disparar búsqueda (default 2)
 *   className                → clase extra para el wrapper
 */
const SearchAutocomplete = ({
	buscar,
	onSeleccionar,
	getLabel = (op) => op?.nombre ?? String(op ?? ''),
	renderOpcion,
	placeholder = 'Buscar...',
	value = null,
	noOptionsText = 'Sin resultados',
	minChars = 2,
	className = '',
}) => {
	const [opciones, setOpciones] = useState([]);
	const [cargando, setCargando] = useState(false);
	const [inputValue, setInputValue] = useState('');

	const handleInputChange = useCallback(
		async (_, nuevoValor) => {
			setInputValue(nuevoValor);

			if (nuevoValor.length < minChars) {
				setOpciones([]);
				return;
			}

			setCargando(true);
			try {
				const resultados = await buscar(nuevoValor);
				setOpciones(resultados ?? []);
			} catch {
				setOpciones([]);
			} finally {
				setCargando(false);
			}
		},
		[buscar, minChars],
	);

	return (
		<ThemeProvider theme={darkTheme}>
			<Autocomplete
				className={className}
				options={opciones}
				value={value}
				inputValue={inputValue}
				getOptionLabel={getLabel}
				onInputChange={handleInputChange}
				onChange={(_, opcion) => onSeleccionar(opcion)}
				loading={cargando}
				loadingText="Buscando..."
				noOptionsText={inputValue.length < minChars ? `Escribe al menos ${minChars} caracteres` : noOptionsText}
				filterOptions={(x) => x}
				isOptionEqualToValue={(op, val) => op?.id_paciente === val?.id_paciente || op?.id === val?.id}
				renderOption={
					renderOpcion
						? (props, opcion) => <li {...props} key={opcion.id_paciente ?? opcion.id ?? opcion.nombre}>{renderOpcion(opcion)}</li>
						: undefined
				}
				renderInput={(params) => (
					<TextField
						{...params}
						placeholder={placeholder}
						size="small"
					/>
				)}
			/>
		</ThemeProvider>
	);
};

export default SearchAutocomplete;

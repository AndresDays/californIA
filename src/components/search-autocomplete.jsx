import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useCallback, useState } from 'react';

// El buscador monta su propio tema de Material UI, así que no lo alcanzaba la
// conversión del CSS: seguía en modo oscuro y aparecía como un recuadro navy
// en medio de las pantallas claras. Los colores salen de los tokens para que
// no vuelva a quedarse atrás cuando cambie la paleta.
const leerToken = (nombre, respaldo) => {
	if (typeof window === "undefined") return respaldo;
	const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre);
	return valor.trim() || respaldo;
};

const temaBuscador = createTheme({
	palette: {
		mode: 'light',
		primary: { main: leerToken('--azul', '#106da0') },
		background: {
			paper: leerToken('--superficie', '#ffffff'),
			default: leerToken('--fondo-app', '#eef2f7'),
		},
		text: {
			primary: leerToken('--texto', '#12293d'),
			secondary: leerToken('--texto-suave', '#4a6178'),
		},
	},
	typography: {
		fontFamily: "'Codec Pro', sans-serif",
		fontSize: 14,
	},
	components: {
		MuiAutocomplete: {
			styleOverrides: {
				paper: {
					background: 'var(--superficie)',
					border: '1px solid var(--borde)',
					borderRadius: '10px',
					boxShadow: 'var(--sombra-alta)',
					marginTop: '4px',
				},
				listbox: {
					padding: '4px',
					'& .MuiAutocomplete-option': {
						borderRadius: '7px',
						padding: '10px 12px',
						fontSize: '0.88rem',
						color: 'var(--texto)',
						'&[aria-selected="true"]': {
							background: 'var(--superficie-activa)',
						},
						'&.Mui-focused': {
							background: 'var(--superficie-hover)',
						},
					},
				},
				noOptions: {
					fontSize: '0.85rem',
					color: 'var(--texto-tenue)',
					padding: '12px',
				},
				loading: {
					fontSize: '0.85rem',
					color: 'var(--texto-suave)',
					padding: '12px',
				},
				clearIndicator: { color: 'var(--texto-tenue)' },
				popupIndicator: { color: 'var(--texto-tenue)' },
			},
		},
		MuiTextField: {
			styleOverrides: {
				root: {
					'& .MuiOutlinedInput-root': {
						background: 'var(--superficie)',
						borderRadius: '8px',
						fontSize: '0.9rem',
						fontFamily: "'Codec Pro', sans-serif",
						color: 'var(--texto)',
						'& fieldset': {
							borderColor: 'var(--borde)',
						},
						'&:hover fieldset': {
							borderColor: 'var(--borde-fuerte)',
						},
						'&.Mui-focused fieldset': {
							borderColor: 'var(--azul)',
							borderWidth: '1px',
						},
					},
					'& .MuiInputLabel-root': {
						fontFamily: "'Codec Pro', sans-serif",
						fontSize: '0.85rem',
						color: 'var(--texto-tenue)',
						'&.Mui-focused': { color: 'var(--azul)' },
					},
					'& input::placeholder': {
						color: 'var(--texto-tenue)',
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
		<ThemeProvider theme={temaBuscador}>
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

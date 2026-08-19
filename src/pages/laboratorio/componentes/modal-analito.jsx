import React, { useEffect, useMemo, useState } from 'react';
import ModalReferencias from './modal-referencias';
import ModalDocumento from './modal-documento';
import { supabase } from '../../../lib/supabase-client';
import './modal-analito.css';

const ModalAnalito = ({ isOpen, onClose, analitoInicial = null, modoEdicion = false, onGuardarImagen }) => {
  const [clave, setClave] = useState('');
  const [bitacora, setBitacora] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [resultadoDefecto, setResultadoDefecto] = useState('');
  const [unidad, setUnidad] = useState('');
  const [digitos, setDigitos] = useState('');
  const [tipoResultado, setTipoResultado] = useState('');

  const [vrBajo, setVrBajo] = useState('');
  const [vrAlto, setVrAlto] = useState('');

  const [referencia, setReferencia] = useState('');
  const [valoresPredeterminados, setValoresPredeterminados] = useState('');
  const [modoTexto, setModoTexto] = useState('Abierto');

  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  const [alineacion, setAlineacion] = useState('Centro');
  const [saltarPagina, setSaltarPagina] = useState(false);
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');

  const [modalReferenciasOpen, setModalReferenciasOpen] = useState(false);
  const [referenciasPendientes, setReferenciasPendientes] = useState([]);

  const [modalDocumentoOpen, setModalDocumentoOpen] = useState(false);
  const [htmlDocumento, setHtmlDocumento] = useState('');

  const esNumerico = useMemo(() => tipoResultado === 'Numerico', [tipoResultado]);
  const esTexto = useMemo(() => tipoResultado === 'Texto', [tipoResultado]);
  const esSubtitulo = useMemo(() => tipoResultado === 'Subtitulo', [tipoResultado]);
  const esValorReferenciado = useMemo(() => tipoResultado === 'Valor Referenciado', [tipoResultado]);
  const esDocumento = useMemo(() => tipoResultado === 'Documento', [tipoResultado]);
  const esImagen = useMemo(() => tipoResultado === 'Imagen', [tipoResultado]);

  const limpiarImagen = () => {
    setAncho('');
    setAlto('');
    setAlineacion('Centro');
    setSaltarPagina(false);
    setArchivoImagen(null);
    setNombreArchivo('');
  };

  const limpiarExtras = () => {
    setVrBajo('');
    setVrAlto('');
    setReferencia('');
    setValoresPredeterminados('');
    setModoTexto('Abierto');
  };

  const limpiarCampos = () => {
    setClave('');
    setBitacora('');
    setDescripcion('');
    setResultadoDefecto('');
    setUnidad('');
    setDigitos('');
    setTipoResultado('');
    setReferenciasPendientes([]);
    setHtmlDocumento('');
    limpiarExtras();
    limpiarImagen();
  };

  const cargarReferenciasDesdeBD = async (idAnalito) => {
    const { data, error } = await supabase
      .from('analito_referencias')
      .select('edad_inicial, edad_final, unidad_edad, sexo, condicion_especial, vr_bajo, vr_alto')
      .eq('id_analito', idAnalito)
      .order('id_referencia', { ascending: true });

    if (error) throw error;

    const refs = (data || []).map((r) => ({
      edad_inicial: r.edad_inicial ?? '',
      edad_final: r.edad_final ?? '',
      unidad_edad: r.unidad_edad || 'Años',
      sexo: r.sexo || 'Ambos',
      condicion_especial: r.condicion_especial || '',
      vr_bajo: r.vr_bajo ?? '',
      vr_alto: r.vr_alto ?? ''
    }));

    setReferenciasPendientes(refs);
  };

  const cargarDocumentoDesdeBD = async (idAnalito) => {
    const { data, error } = await supabase
      .from('analito_documentos')
      .select('contenido_html')
      .eq('id_analito', idAnalito)
      .maybeSingle();

    if (error) throw error;
    setHtmlDocumento(data?.contenido_html || '');
  };

  useEffect(() => {
    if (!isOpen) return;

    const run = async () => {
      if (!analitoInicial) {
        limpiarCampos();
        return;
      }

      setClave(analitoInicial.clave || '');
      setBitacora(analitoInicial.bitacora || '');
      setDescripcion(analitoInicial.descripcion || '');
      setResultadoDefecto(analitoInicial.resultado_defecto || '');
      setUnidad(analitoInicial.unidad || '');
      setDigitos(analitoInicial.digitos || '');
      setTipoResultado(analitoInicial.tipo_resultado || '');

      setVrBajo(analitoInicial.vr_bajo ?? '');
      setVrAlto(analitoInicial.vr_alto ?? '');

      setReferencia(analitoInicial.referencia ?? '');
      setValoresPredeterminados(analitoInicial.valores_predeterminados ?? '');
      setModoTexto(analitoInicial.modo_texto || 'Abierto');

      setAncho(analitoInicial.ancho ?? '');
      setAlto(analitoInicial.alto ?? '');
      setAlineacion(analitoInicial.alineacion || 'Centro');
      setSaltarPagina(Boolean(analitoInicial.saltar_pagina));
      setNombreArchivo(analitoInicial.nombre_archivo || '');
      setArchivoImagen(null);

      setHtmlDocumento('');

      if (modoEdicion && analitoInicial?.id_analito) {
        try {
          await Promise.all([
            cargarReferenciasDesdeBD(analitoInicial.id_analito),
            cargarDocumentoDesdeBD(analitoInicial.id_analito)
          ]);
        } catch {
          setReferenciasPendientes([]);
          setHtmlDocumento('');
        }
      } else {
        setReferenciasPendientes([]);
        setHtmlDocumento('');
      }
    };

    run();
  }, [isOpen, analitoInicial, modoEdicion]);

  useEffect(() => {
    if (!tipoResultado) {
      limpiarExtras();
      limpiarImagen();
      setHtmlDocumento('');
      return;
    }

    if (tipoResultado === 'Numerico') {
      setReferencia('');
      setValoresPredeterminados('');
      setModoTexto('Abierto');
      setHtmlDocumento('');
      limpiarImagen();
      return;
    }

    if (tipoResultado === 'Subtitulo') {
      setVrBajo('');
      setVrAlto('');
      setValoresPredeterminados('');
      setModoTexto('Abierto');
      setHtmlDocumento('');
      limpiarImagen();
      return;
    }

    if (tipoResultado === 'Texto') {
      setVrBajo('');
      setVrAlto('');
      setHtmlDocumento('');
      limpiarImagen();
      return;
    }

    if (tipoResultado === 'Valor Referenciado') {
      setVrBajo('');
      setVrAlto('');
      setReferencia('');
      setValoresPredeterminados('');
      setModoTexto('Abierto');
      setHtmlDocumento('');
      limpiarImagen();
      return;
    }

    if (tipoResultado === 'Documento') {
      setVrBajo('');
      setVrAlto('');
      setReferencia('');
      setValoresPredeterminados('');
      setModoTexto('Abierto');
      limpiarImagen();
      return;
    }

    if (tipoResultado === 'Imagen') {
      setVrBajo('');
      setVrAlto('');
      setReferencia('');
      setValoresPredeterminados('');
      setModoTexto('Abierto');
      setHtmlDocumento('');
      return;
    }

    limpiarExtras();
    limpiarImagen();
    setHtmlDocumento('');
  }, [tipoResultado]);

  const handleClose = () => {
    limpiarCampos();
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleAgregarReferencias = () => setModalReferenciasOpen(true);
  const handleCrearDocumento = () => setModalDocumentoOpen(true);

  const handleSeleccionarImagen = (e) => {
    const file = e.target.files?.[0] || null;
    setArchivoImagen(file);
    setNombreArchivo(file?.name || '');
  };

  const handleGuardarImagen = async () => {
    if (!archivoImagen) {
      globalThis.mostrarNotificacion('Selecciona una imagen primero', 'advertencia');
      return;
    }
    if (typeof onGuardarImagen === 'function') {
      await onGuardarImagen({ file: archivoImagen, ancho, alto, alineacion, saltarPagina });
      return;
    }
    globalThis.mostrarNotificacion('Configura onGuardarImagen para subir a Storage', 'advertencia');
  };

  const guardarReferenciasEnBD = async (idAnalito, refs) => {
    const { error: delError } = await supabase.from('analito_referencias').delete().eq('id_analito', idAnalito);
    if (delError) throw delError;

    if (!refs?.length) return;

    const payload = refs.map((r) => ({
      id_analito: idAnalito,
      edad_inicial: r.edad_inicial === '' ? null : Number(r.edad_inicial),
      edad_final: r.edad_final === '' ? null : Number(r.edad_final),
      unidad_edad: r.unidad_edad,
      sexo: r.sexo,
      condicion_especial: r.condicion_especial || null,
      vr_bajo: r.vr_bajo === '' ? null : Number(r.vr_bajo),
      vr_alto: r.vr_alto === '' ? null : Number(r.vr_alto)
    }));

    const { error: insError } = await supabase.from('analito_referencias').insert(payload);
    if (insError) throw insError;
  };

  const upsertDocumentoEnBD = async (idAnalito, html) => {
    const { error } = await supabase
      .from('analito_documentos')
      .upsert({ id_analito: idAnalito, contenido_html: html || '' }, { onConflict: 'id_analito' });

    if (error) throw error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clave.trim() || !descripcion.trim()) {
      globalThis.mostrarNotificacion('Por favor, complete al menos la Clave y la Descripción', 'advertencia');
      return;
    }

    const analitoData = {
      clave: clave.trim(),
      bitacora: bitacora.trim(),
      descripcion: descripcion.trim(),
      resultado_defecto: resultadoDefecto.trim(),
      unidad: unidad.trim(),
      digitos: digitos.trim(),
      tipo_resultado: tipoResultado,

      vr_bajo: esNumerico ? (vrBajo.trim() === '' ? null : Number(vrBajo)) : null,
      vr_alto: esNumerico ? (vrAlto.trim() === '' ? null : Number(vrAlto)) : null,

      referencia: (esSubtitulo || esTexto) ? (referencia.trim() || null) : null,
      valores_predeterminados: esTexto ? (valoresPredeterminados.trim() || null) : null,
      modo_texto: esTexto ? (modoTexto || 'Abierto') : null,

      ancho: esImagen ? (ancho.trim() || null) : null,
      alto: esImagen ? (alto.trim() || null) : null,
      alineacion: esImagen ? (alineacion || 'Centro') : null,
      saltar_pagina: esImagen ? Boolean(saltarPagina) : false,
      nombre_archivo: esImagen ? (nombreArchivo || null) : null
    };

    try {
      let idAnalito = null;

      if (modoEdicion && analitoInicial?.id_analito) {
        const { data, error } = await supabase
          .from('analitos')
          .update(analitoData)
          .eq('id_analito', analitoInicial.id_analito)
          .select('id_analito')
          .single();

        if (error) throw error;
        idAnalito = data.id_analito;
      } else {
        const { data, error } = await supabase
          .from('analitos')
          .insert(analitoData)
          .select('id_analito')
          .single();

        if (error) throw error;
        idAnalito = data.id_analito;
      }

      if (esValorReferenciado) {
        await guardarReferenciasEnBD(idAnalito, referenciasPendientes);
      }

      if (!esValorReferenciado) {
        await supabase.from('analito_referencias').delete().eq('id_analito', idAnalito);
      }

      if (esDocumento) {
        await upsertDocumentoEnBD(idAnalito, htmlDocumento);
      }

      if (!esDocumento) {
        await supabase.from('analito_documentos').delete().eq('id_analito', idAnalito);
      }

      limpiarCampos();
      onClose();
    } catch (err) {
      console.error(err);
      globalThis.mostrarNotificacion(`Error guardando analito: ${err?.message || err}`, 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-analito" onClick={handleOverlayClick}>
      <div className="modal-contenedor-analito" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-analito">
          <h2 className="modal-titulo-analito">{modoEdicion ? 'Editar Analito' : 'Crear Analito'}</h2>
          <button className="modal-btn-cerrar-analito" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-contenido-analito">
          <div className="modal-fila-analito">
            <div className="modal-campo-analito">
              <label>Clave</label>
              <input type="text" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Clave" className="modal-input-analito" autoFocus />
            </div>

            <div className="modal-campo-analito">
              <label>Bitácora</label>
              <input type="text" value={bitacora} onChange={(e) => setBitacora(e.target.value)} placeholder="Bitacora" className="modal-input-analito" />
            </div>
          </div>

          <div className="modal-campo-analito">
            <label>Descripción</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripcion" className="modal-input-analito" />
          </div>

          <div className="modal-campo-analito">
            <label>Resultado por Defecto</label>
            <input type="text" value={resultadoDefecto} onChange={(e) => setResultadoDefecto(e.target.value)} placeholder="Resultado por Defecto" className="modal-input-analito" />
          </div>

          <div className="modal-fila-analito modal-fila-tres">
            <div className="modal-campo-analito">
              <label>Unidad</label>
              <input type="text" value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Unidad" className="modal-input-analito" />
            </div>

            <div className="modal-campo-analito">
              <label>Dígitos</label>
              <input type="text" value={digitos} onChange={(e) => setDigitos(e.target.value)} placeholder="# dígitos" className="modal-input-analito" />
            </div>

            <div className="modal-campo-analito">
              <label>Tipo de Resultado</label>
              <select value={tipoResultado} onChange={(e) => setTipoResultado(e.target.value)} className="modal-select-analito">
                <option value="">Selecciona una Opción</option>
                <option value="Numerico">Numérico</option>
                <option value="Texto">Texto</option>
                <option value="Subtitulo">Subtítulo</option>
                <option value="Valor Referenciado">Valor Referenciado</option>
                <option value="Documento">Documento</option>
                <option value="Imagen">Imagen</option>
              </select>
            </div>
          </div>

          {esNumerico && (
            <div className="modal-fila-analito">
              <div className="modal-campo-analito">
                <label className="modal-label-vr">VR-Bajo</label>
                <input type="text" value={vrBajo} onChange={(e) => setVrBajo(e.target.value)} placeholder="Valor mínimo" className="modal-input-analito" />
              </div>

              <div className="modal-campo-analito">
                <label className="modal-label-vr">VR-Alto</label>
                <input type="text" value={vrAlto} onChange={(e) => setVrAlto(e.target.value)} placeholder="Valor máximo" className="modal-input-analito" />
              </div>
            </div>
          )}

          {esSubtitulo && (
            <div className="modal-campo-analito">
              <label>Referencia</label>
              <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Escribir la Referencia" className="modal-input-analito" />
            </div>
          )}

          {esTexto && (
            <>
              <div className="modal-campo-analito">
                <label>Referencia</label>
                <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Escribir la Referencia" className="modal-input-analito" />
              </div>

              <div className="modal-campo-analito">
                <label>Valores predeterminados</label>
                <input type="text" value={valoresPredeterminados} onChange={(e) => setValoresPredeterminados(e.target.value)} placeholder="Valores predeterminados" className="modal-input-analito" />
              </div>

              <div className="modal-campo-analito">
                <label>Modo</label>
                <div className="modal-radio-row">
                  <label className="modal-radio-item">
                    <input type="radio" name="modoTexto" value="Abierto" checked={modoTexto === 'Abierto'} onChange={() => setModoTexto('Abierto')} />
                    Abierto
                  </label>

                  <label className="modal-radio-item">
                    <input type="radio" name="modoTexto" value="Restringido" checked={modoTexto === 'Restringido'} onChange={() => setModoTexto('Restringido')} />
                    Restringido
                  </label>
                </div>
              </div>
            </>
          )}

          {esValorReferenciado && (
            <div className="modal-campo-analito">
              <button type="button" className="modal-btn-accion-inline" onClick={handleAgregarReferencias}>
                Agregar Referencias
              </button>
            </div>
          )}

          {esDocumento && (
            <div className="modal-campo-analito">
              <button type="button" className="modal-btn-accion-inline" onClick={handleCrearDocumento}>
                Crear Documento
              </button>
            </div>
          )}

          {esImagen && (
            <>
              <div className="modal-fila-analito">
                <div className="modal-campo-analito">
                  <label>Ancho</label>
                  <input type="text" value={ancho} onChange={(e) => setAncho(e.target.value)} placeholder="Ancho" className="modal-input-analito" />
                </div>

                <div className="modal-campo-analito">
                  <label>Alto</label>
                  <input type="text" value={alto} onChange={(e) => setAlto(e.target.value)} placeholder="Alto" className="modal-input-analito" />
                </div>
              </div>

              <div className="modal-campo-analito">
                <div className="modal-radio-row">
                  <label className="modal-radio-item">
                    <input type="radio" name="alineacion" value="Izquierda" checked={alineacion === 'Izquierda'} onChange={() => setAlineacion('Izquierda')} />
                    Izquierda
                  </label>

                  <label className="modal-radio-item">
                    <input type="radio" name="alineacion" value="Centro" checked={alineacion === 'Centro'} onChange={() => setAlineacion('Centro')} />
                    Centro
                  </label>

                  <label className="modal-radio-item">
                    <input type="radio" name="alineacion" value="Derecha" checked={alineacion === 'Derecha'} onChange={() => setAlineacion('Derecha')} />
                    Derecha
                  </label>
                </div>

                <label className="modal-checkbox-item" style={{ marginTop: '0.5rem' }}>
                  <input type="checkbox" checked={saltarPagina} onChange={(e) => setSaltarPagina(e.target.checked)} />
                  Saltar Página
                </label>
              </div>

              <div className="modal-fila-analito">
                <div className="modal-campo-analito">
                  <label>Selecciona Imagen</label>
                  <input type="file" accept="image/*" onChange={handleSeleccionarImagen} className="modal-input-analito" />
                </div>

                <div className="modal-campo-analito">
                  <label>Archivo</label>
                  <input type="text" value={nombreArchivo} readOnly placeholder="imagen.jpg" className="modal-input-analito" />
                </div>
              </div>

              <div className="modal-campo-analito">
                <button type="button" className="modal-btn-accion-inline" onClick={handleGuardarImagen}>
                  Guardar Imagen
                </button>
              </div>
            </>
          )}

          <div className="modal-botones-analito">
            <button type="button" className="modal-btn-salir-analito" onClick={handleClose}>
              Salir
            </button>
            <button type="submit" className="modal-btn-guardar-analito">
              Guardar
            </button>
          </div>
        </form>

        <ModalReferencias
          isOpen={modalReferenciasOpen}
          onClose={() => setModalReferenciasOpen(false)}
          initialReferencias={referenciasPendientes}
          onGuardar={(refs) => {
            setReferenciasPendientes(refs);
            setModalReferenciasOpen(false);
          }}
        />

        <ModalDocumento
          isOpen={modalDocumentoOpen}
          onClose={() => setModalDocumentoOpen(false)}
          htmlInicial={htmlDocumento}
          modoEdicion={modoEdicion}
          onGuardar={(html) => setHtmlDocumento(html)}
        />
      </div>
    </div>
  );
};

export default ModalAnalito;

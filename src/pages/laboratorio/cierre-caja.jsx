import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout.jsx';
import Header from '../../components/header-principal.jsx';
import SidebarHome from '../../components/sidebar-home.jsx';
import './cierre-caja.css';

const CierreCaja = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fechaActual, setFechaActual] = useState(new Date().toISOString().split('T')[0]);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('JUAN ANDRES DIAZ RODRIGUEZ');

  const [montoApertura, setMontoApertura] = useState(0);

  const [ventasEfectivo, setVentasEfectivo] = useState(0);
  const [ingresosEfectivo, setIngresosEfectivo] = useState(0);
  const [egresosEfectivo, setEgresosEfectivo] = useState(0);
  const [totalEfectivo, setTotalEfectivo] = useState(0);

  const [ventasTarjeta, setVentasTarjeta] = useState(0);
  const [ingresosTarjeta, setIngresosTarjeta] = useState(0);
  const [egresosTarjeta, setEgresosTarjeta] = useState(0);
  const [totalTarjeta, setTotalTarjeta] = useState(0);

  const [transferencias, setTransferencias] = useState(0);
  const [ingresosTransferencias, setIngresosTransferencias] = useState(0);
  const [egresosTransferencias, setEgresosTransferencias] = useState(0);
  const [totalTransferencias, setTotalTransferencias] = useState(0);

  const [credito, setCredito] = useState(0);
  const [ingresosCredito, setIngresosCredito] = useState(0);
  const [egresosCredito, setEgresosCredito] = useState(0);
  const [totalCredito, setTotalCredito] = useState(0);

  const [montoCancelados, setMontoCancelados] = useState(0);
  const [totalEnCaja, setTotalEnCaja] = useState(0);
  const [totalAdeudos, setTotalAdeudos] = useState(0);

  const [empleadoData, setEmpleadoData] = useState(null);

  useEffect(() => {
      const fetchEmpleadoData = async () => {
        if (!user?.id) return;

        try {
          const { data: empleado, error } = await supabase
            .from('empleados')
            .select('nombre, rol')
            .eq('auth_uuid', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error al obtener empleado:', error);
            return;
          }

          if (empleado) {
            setEmpleadoData(empleado);
          }
        } catch (error) {
          console.error('Error al obtener datos del empleado:', error);
        }
      };

      fetchEmpleadoData();
    }, [user]);

  useEffect(() => {
    cargarSucursales();
  }, []);

  useEffect(() => {
    calcularTotales();
  }, [
    montoApertura,
    ventasEfectivo, ingresosEfectivo, egresosEfectivo,
    ventasTarjeta, ingresosTarjeta, egresosTarjeta,
    transferencias, ingresosTransferencias, egresosTransferencias,
    credito, ingresosCredito, egresosCredito,
    montoCancelados
  ]);

  const cargarSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id_sucursal, nombre')
        .order('nombre');

      if (error) throw error;

      setSucursales(data || []);
      
      if (data && data.length > 0) {
        setSucursalSeleccionada(data[0].id_sucursal);
      }
    } catch (error) {
      console.error('Error al cargar sucursales:', error);
    }
  };

  const calcularTotales = () => {
    const totEfectivo = ventasEfectivo + ingresosEfectivo - egresosEfectivo;
    const totTarjeta = ventasTarjeta + ingresosTarjeta - egresosTarjeta;
    const totTransferencias = transferencias + ingresosTransferencias - egresosTransferencias;
    const totCredito = credito + ingresosCredito - egresosCredito;

    setTotalEfectivo(totEfectivo);
    setTotalTarjeta(totTarjeta);
    setTotalTransferencias(totTransferencias);
    setTotalCredito(totCredito);

    const totCaja = montoApertura + totEfectivo + totTarjeta + totTransferencias + totCredito - montoCancelados;
    setTotalEnCaja(totCaja);
  };

  const handleAperturaCaja = () => {
    alert('Apertura de caja realizada');
  };

  const handleNuevoMovimiento = () => {
    alert('Registrar nuevo movimiento');
  };

  const handleImprimirDetalle = () => {
    window.print();
  };

  const handleImprimirDetalleSucursal = () => {
    alert('Imprimir detalle de sucursal');
  };

  const getPrimerNombre = (nombreCompleto) => {
       if (!nombreCompleto) return user?.email?.split('@')[0] || 'Usuario';
       return nombreCompleto;
     };

  const formatRol = (rol) => {
   if (!rol) return 'Usuario';

  const roles = {
     'admin': 'Administrador',
     'administrador': 'Administrador',
     'radiologo': 'Radiólogo - Director',
     'doctor': 'Médico',
     'medico': 'Médico',
     'tecnico_radiologia': 'Técnico en Radiología',
     'tecnico': 'Técnico',
     'quimico': 'Químico',
     'recepcionista': 'Recepcionista',
     'desarrollador': 'Desarrollador'
  };

   return roles[rol] || rol;
  };

 const handleLogout = async () => {
   const { signOut } = useAuth();
   await signOut();
   navigate('/login');
 };

  return (
    <Layout>
      <div className="cierre-caja-wrapper">
        <Header
          empleadoData={empleadoData}
          formatRol={formatRol}
          getPrimerNombre={getPrimerNombre}
          user={user}
          handleLogout={handleLogout}
          currentPage="cierre-caja"
        />

        <SidebarHome/>

        <div className="cierre-caja-header">
          <h1 className="cierre-caja-title">Cierre Caja</h1>
        </div>

        <div className="cierre-caja-content">
          <div className="controles-cierre">
            <div className="fecha-actual-grupo">
              <label>📅 Fecha Actual:</label>
              <input
                type="date"
                value={fechaActual}
                onChange={(e) => setFechaActual(e.target.value)}
                className="input-fecha-cierre"
              />
            </div>

            <div className="sucursal-grupo">
              <span className="icon-edificio">🏢</span>
              <select
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                className="select-sucursal-cierre"
              >
                <option value="">Selecciona una Sucursal</option>
                {sucursales.map(sucursal => (
                  <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="usuario-grupo">
              <span className="icon-usuario">👤</span>
              <select
                value={usuarioSeleccionado}
                onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                className="select-usuario-cierre"
              >
                <option value="JUAN ANDRES DIAZ RODRIGUEZ">JUAN ANDRES DIAZ RODRIGUEZ</option>
                <option value="OTRO USUARIO">OTRO USUARIO</option>
              </select>
            </div>
          </div>

          <div className="botones-accion-cierre">
            <button className="btn-apertura-caja" onClick={handleAperturaCaja}>
              Apertura Caja
            </button>
            <button className="btn-nuevo-movimiento" onClick={handleNuevoMovimiento}>
              Nuevo movimiento
            </button>
            <button className="btn-imprimir-detalle" onClick={handleImprimirDetalle}>
              Imprimir Detalle Caja
            </button>
            <button className="btn-imprimir-sucursal" onClick={handleImprimirDetalleSucursal}>
              Imprimir Detalle Caja Sucursal
            </button>
          </div>

          {/* Monto Apertura */}
          <div className="monto-apertura-section">
            <label>Monto Apertura</label>
            <input
              type="number"
              value={montoApertura}
              onChange={(e) => setMontoApertura(parseFloat(e.target.value) || 0)}
              className="input-monto-apertura"
            />
          </div>

          <div className="campos-cierre-grid">
            <div className="campo-cierre verde">
              <label>Ventas Efectivo</label>
              <input
                type="number"
                value={ventasEfectivo}
                onChange={(e) => setVentasEfectivo(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre verde">
              <label>Ingresos Efectivo</label>
              <input
                type="number"
                value={ingresosEfectivo}
                onChange={(e) => setIngresosEfectivo(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre rojo">
              <label>Egresos Efectivo</label>
              <input
                type="number"
                value={egresosEfectivo}
                onChange={(e) => setEgresosEfectivo(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre azul">
              <label>Total Efectivo</label>
              <input
                type="number"
                value={totalEfectivo}
                readOnly
                className="input-campo-cierre"
              />
            </div>

            <div className="campo-cierre verde">
              <label>Ventas Tarjeta</label>
              <input
                type="number"
                value={ventasTarjeta}
                onChange={(e) => setVentasTarjeta(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre verde">
              <label>Ingresos Tarjeta</label>
              <input
                type="number"
                value={ingresosTarjeta}
                onChange={(e) => setIngresosTarjeta(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre rojo">
              <label>Egresos Tarjeta</label>
              <input
                type="number"
                value={egresosTarjeta}
                onChange={(e) => setEgresosTarjeta(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre azul">
              <label>Total Tarjeta</label>
              <input
                type="number"
                value={totalTarjeta}
                readOnly
                className="input-campo-cierre"
              />
            </div>

            <div className="campo-cierre verde">
              <label>Transferencias</label>
              <input
                type="number"
                value={transferencias}
                onChange={(e) => setTransferencias(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre verde">
              <label>Ingresos Transferencias</label>
              <input
                type="number"
                value={ingresosTransferencias}
                onChange={(e) => setIngresosTransferencias(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre rojo">
              <label>Egresos Transferencias</label>
              <input
                type="number"
                value={egresosTransferencias}
                onChange={(e) => setEgresosTransferencias(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre azul">
              <label>Total Transferencias</label>
              <input
                type="number"
                value={totalTransferencias}
                readOnly
                className="input-campo-cierre"
              />
            </div>

            <div className="campo-cierre verde">
              <label>Credito</label>
              <input
                type="number"
                value={credito}
                onChange={(e) => setCredito(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre verde">
              <label>Ingresos Credito</label>
              <input
                type="number"
                value={ingresosCredito}
                onChange={(e) => setIngresosCredito(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre rojo">
              <label>Egresos Credito</label>
              <input
                type="number"
                value={egresosCredito}
                onChange={(e) => setEgresosCredito(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
            <div className="campo-cierre azul">
              <label>Total Credito</label>
              <input
                type="number"
                value={totalCredito}
                readOnly
                className="input-campo-cierre"
              />
            </div>
          </div>

          <div className="totales-finales-cierre">
            <div className="campo-cierre rojo">
              <label>Monto Cancelados</label>
              <input
                type="number"
                value={montoCancelados}
                onChange={(e) => setMontoCancelados(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>

            <div className="espacio-vacio"></div>

            <div className="campo-cierre azul">
              <label>Total en Caja</label>
              <input
                type="number"
                value={totalEnCaja}
                readOnly
                className="input-campo-cierre"
              />
            </div>

            <div className="campo-cierre azul">
              <label>Total Adeudos</label>
              <input
                type="number"
                value={totalAdeudos}
                onChange={(e) => setTotalAdeudos(parseFloat(e.target.value) || 0)}
                className="input-campo-cierre"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CierreCaja;
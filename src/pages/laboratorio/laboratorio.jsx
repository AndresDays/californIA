import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout.jsx';
import './laboratorio.css';
import HeaderLab from '../../components/header-laboratorio.jsx';
import californIA from '../../assets/CalifornIA.png';
import pacienteIcono from '../../assets/pacienteIcono.png';
import imprimirIcono from '../../assets/imprimirIcono.png';
import entregaIcono from '../../assets/entregaIcono.png';

const Laboratorio = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="laboratorio-wrapper">
        <HeaderLab/>

        <main className="laboratorio-main">
          {/* <div className="laboratorio-hero">
            <img 
              src={californIA} 
              alt="CalifornIA" 
              className="laboratorio-logo"
            />
            <h2 className="laboratorio-subtitle">Laboratorio</h2>
          </div> */}

          <div className="laboratorio-modules">
            <div 
              className="module-card"
              onClick={() => navigate('/nuevo-paciente')}
            >
              <img 
                src={pacienteIcono} 
                alt="Nuevo Paciente" 
                className="module-icon"
              />
              <h3 className="module-title">Nuevo Paciente</h3>
            </div>

            <div 
              className="module-card"
              onClick={() => navigate('/captura')}
            >
              <img 
                src={imprimirIcono} 
                alt="Captura" 
                className="module-icon"
              />
              <h3 className="module-title">Captura</h3>
            </div>

            <div 
              className="module-card"
              onClick={() => navigate('/entrega-resultados')}
            >
              <img 
                src={entregaIcono} 
                alt="Entrega Resultados" 
                className="module-icon"
              />
              <h3 className="module-title">Entrega Resultados</h3>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Laboratorio;
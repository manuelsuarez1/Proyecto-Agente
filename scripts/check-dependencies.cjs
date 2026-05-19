#!/usr/bin/env node

console.log('Verificando dependencias...');

const { exec } = require('child_process');

// Verificar dependencias desactualizadas
exec('npm outdated', (error, stdout, stderr) => {
  if (error) {
    if (error.code === 1) {
      // npm outdated returns code 1 when there are outdated packages
      console.log('Dependencias desactualizadas encontradas:');
      console.log(stdout || stderr);
    }
  } else {
    console.log('No hay dependencias desactualizadas');
  }
  
  // Verificar vulnerabilidades de seguridad
  exec('npm audit', (error, stdout, stderr) => {
    if (error) {
      console.log('Se encontraron vulnerabilidades de seguridad:');
      console.log(stdout || stderr);
    } else {
      console.log('No se encontraron vulnerabilidades de seguridad');
    }
    
    process.exit(0);
  });
});

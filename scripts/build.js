#!/usr/bin/env node

/**
 * Build script for the MCP Chrome client project
 * This script handles the build process for the project
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Get project root directory
const projectRoot = process.cwd();

// Define build directory
const buildDir = join(projectRoot, 'dist');

// Function to copy files recursively
function copyRecursiveSync(src, dest) {
    const exists = existsSync(src);
    const stats = exists && statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        mkdirSync(dest, { recursive: true });
        readdirSync(src).forEach(function(childItemName) {
            copyRecursiveSync(
                join(src, childItemName),
                join(dest, childItemName)
            );
        });
    } else {
        // For JavaScript files, we need to ensure they work properly with ES modules
        if (src.endsWith('.js')) {
            let content = '';
            try {
                content = readFileSync(src, 'utf8');
            } catch (err) {
                console.error(`Error reading file ${src}:`, err.message);
                return;
            }
            
            // Write the content as-is since we're using ES modules
            try {
                writeFileSync(dest, content, 'utf8');
            } catch (err) {
                console.error(`Error writing file ${dest}:`, err.message);
            }
        } else {
            copyFileSync(src, dest);
        }
    }
}

console.log('Starting build process...');

try {
    // Create dist directory if it doesn't exist
    if (!existsSync(buildDir)) {
        console.log('Creating dist directory...');
        mkdirSync(buildDir, { recursive: true });
    }

    // Copy source files to dist directory
    console.log('Copying source files...');
    copyRecursiveSync(join(projectRoot, 'src'), join(buildDir, 'src'));
    
    // Copy package.json to dist and update the main field and scripts
    console.log('Copying and updating package.json...');
    const packageJsonPath = join(projectRoot, 'package.json');
    const distPackageJsonPath = join(buildDir, 'package.json');
    
    if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        // Update main field to point to src/index.js
        packageJson.main = 'src/index.js';
        // Update start script to point to the correct location
        packageJson.scripts.start = 'node src/index.js';
        writeFileSync(distPackageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    }

    // Copy .env.example if it exists
    const envExamplePath = join(projectRoot, '.env.example');
    if (existsSync(envExamplePath)) {
        console.log('Copying .env.example...');
        copyFileSync(envExamplePath, join(buildDir, '.env.example'));
    }

    // Copy other necessary files
    const filesToCopy = ['README.md', 'LICENSE', '.gitignore'];
    filesToCopy.forEach(file => {
        const filePath = join(projectRoot, file);
        if (existsSync(filePath)) {
            console.log(`Copying ${file}...`);
            copyFileSync(filePath, join(buildDir, file));
        }
    });

    console.log('Build completed successfully!');
} catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
}
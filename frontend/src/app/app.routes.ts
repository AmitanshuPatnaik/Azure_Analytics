import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Login } from './pages/login/login';

import { Pipelines } from './pipelines/pipelines';
import { Project1 } from './pages/project1/project1';
import { Repos } from './pages/repos/repos';
import { Azure } from './pages/azure/azure';

import { authGuard } from './guards/auth-guard';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: Login
  },

  {
    path: 'home',
    component: Home,
    canActivate: [authGuard]
  },

  {
    path: 'about',
    component: About,
    canActivate: [authGuard]
  },

  {
    path: 'project1',
    component: Project1,
    canActivate: [authGuard]
  },

  {
    path: 'repos',
    component: Repos,
    canActivate: [authGuard]
  },

  {
    path: 'pipelines',
    component: Pipelines,
    canActivate: [authGuard]
  },

  {
    path: 'azure',
    component: Azure,
    canActivate: [authGuard]
  }

];
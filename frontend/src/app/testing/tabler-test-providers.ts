import type { Provider } from '@angular/core';
import { provideTablerIcons } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';

export const TABLER_TEST_PROVIDERS: Provider[] = [...provideTablerIcons(TablerIcons)];

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveServiceUnit,serviceUnitRate} from '../src/utils/servicePricing.ts';
test('empty unit catalog still resolves square-foot pricing from the saved service',()=>{const service={pricePerSqFt:15,pricePerUnit:0};const unit=resolveServiceUnit(service,[]);assert.equal(unit.unitType,'square');assert.equal(serviceUnitRate(service,unit),15);});
test('quantity-based services work with no unit documents',()=>{const service={pricePerSqFt:0,pricePerUnit:20};const unit=resolveServiceUnit(service,[]);assert.equal(unit.unitType,'unit');assert.equal(serviceUnitRate(service,unit),20);});
test('a populated linked unit remains authoritative without a separate catalog request',()=>{const linked={_id:'linked',unitType:'others',label:'Tank count'};const service={pricePerSqFt:15,pricePerUnit:25,unitConfig:linked};assert.equal(resolveServiceUnit(service),linked);assert.equal(serviceUnitRate(service,linked),25);});
test('a linked ID selects its own configuration rather than the first catalog option',()=>{const square={_id:'square',unitType:'square',label:'Area'};const unit={_id:'count',unitType:'unit',label:'Rooms'};assert.equal(resolveServiceUnit({unitConfig:'count'},[square,unit]),unit);});
test('unlinked services do not adopt an unrelated first catalog unit',()=>{assert.equal(resolveServiceUnit({pricePerSqFt:15,pricePerUnit:0},[{_id:'count',unitType:'unit',label:'Rooms'}]).unitType,'square');});
test('legacy dual-rate and fixed-price services match backend unit defaults',()=>{assert.equal(resolveServiceUnit({pricePerSqFt:15,pricePerUnit:20}).unitType,'unit');const service={pricePerSqFt:0,pricePerUnit:0};assert.equal(serviceUnitRate(service,resolveServiceUnit(service)),0);});

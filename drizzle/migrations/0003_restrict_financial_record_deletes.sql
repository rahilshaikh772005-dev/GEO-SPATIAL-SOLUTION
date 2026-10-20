ALTER TABLE `bills`
  DROP FOREIGN KEY `bills_propertyId_properties_id_fk`,
  ADD CONSTRAINT `bills_propertyId_properties_id_fk`
    FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE RESTRICT;

ALTER TABLE `payments`
  DROP FOREIGN KEY `payments_billId_bills_id_fk`,
  ADD CONSTRAINT `payments_billId_bills_id_fk`
    FOREIGN KEY (`billId`) REFERENCES `bills`(`id`) ON DELETE RESTRICT,
  DROP FOREIGN KEY `payments_userId_users_id_fk`,
  ADD CONSTRAINT `payments_userId_users_id_fk`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT;
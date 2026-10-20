CREATE TABLE IF NOT EXISTS `propertyClaims` (
  `id` int AUTO_INCREMENT NOT NULL,
  `propertyId` int NOT NULL,
  `claimantUserId` int NOT NULL,
  `claimReason` text NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewedBy` int,
  `reviewedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `propertyClaims_id` PRIMARY KEY(`id`),
  CONSTRAINT `propertyClaims_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE,
  CONSTRAINT `propertyClaims_claimantUserId_users_id_fk` FOREIGN KEY (`claimantUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `propertyClaims_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

ALTER TABLE `payments`
  MODIFY COLUMN `status` enum('success','pending','failed') NOT NULL DEFAULT 'pending',
  ADD COLUMN `providerPaymentId` varchar(128) UNIQUE,
  ADD COLUMN `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY COLUMN `paidAt` timestamp NULL DEFAULT NULL;
import { Entity, Column, PrimaryColumn } from "typeorm"

interface IAlbumDictionaryItem {
    _id?: string;
    albumCoverImage: string;
    name: string;
    uuid: string;
    type: string;
    estimatedPicCount: number;
    isHidden: boolean;
}

@Entity({name:"Albums"})
export class Album implements IAlbumDictionaryItem {
    
    @PrimaryColumn()
    id: string
    
    @Column()
    albumCoverImage: string
    
    @Column()
    name: string
    
    @Column()
    uuid: string
    
    @Column()
    type: string
    
    @Column()
    estimatedPicCount: number
    
    @Column()
    isHidden: boolean

} 
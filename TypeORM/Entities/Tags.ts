import { Entity, ObjectIdColumn, ObjectId, Column, EntitySchema, PrimaryColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm"
interface ITags {
    tag: string;
    category?: string;
}

@Unique(["tag"])
@Entity({name:"Tags"})
export class Tag implements ITags {
    @Column({unique:true, generated:false, primary: true})
    tag: string;

    @Column({nullable: true})
    category?: string;
}